// /assets/js/main_chat.js
import { ensureStart, ask, greet } from '/assets/js/aiCore.js';

(function () {
  const $wrap = document.getElementById('fcChat');
  const $log = document.getElementById('chatLog');
  const $input = document.getElementById('chatInput');
  
  // 모바일 디버깅: 화면에 표시
  if (!$wrap || !$log || !$input) {
    document.body.insertAdjacentHTML('beforeend', 
      `<div style="position:fixed;top:0;left:0;right:0;background:red;color:white;padding:20px;z-index:99999;font-size:14px;">
        ❌ 채팅창 로딩 실패<br>
        fcChat: ${$wrap ? '✅' : '❌'}<br>
        chatLog: ${$log ? '✅' : '❌'}<br>
        chatInput: ${$input ? '❌' : '✅'}
      </div>`
    );
    return;
  }
  
  // 성공 시 입력창에 표시
  $input.placeholder = '✅ 채팅 로딩 완료! 질문을 입력하세요';

  /* ===== 모바일 감지 (최상단에서 선언) ===== */
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  /* ---------- 채팅창 스크롤 전파 방지 (모바일 대응) ---------- */
  /* ===== 모바일: body 스크롤 차단/복원 함수 ===== */
  let scrollPosition = 0;
  
  function disableBodyScroll() {
    scrollPosition = window.pageYOffset;
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.height = '100%';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollPosition}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.height = '100vh';
    document.body.style.touchAction = 'none';
  }
  
  function enableBodyScroll() {
    document.documentElement.style.removeProperty('overflow');
    document.documentElement.style.removeProperty('height');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('position');
    document.body.style.removeProperty('top');
    document.body.style.removeProperty('left');
    document.body.style.removeProperty('right');
    document.body.style.removeProperty('width');
    document.body.style.removeProperty('height');
    document.body.style.removeProperty('touch-action');
    window.scrollTo(0, scrollPosition);
  }

  /* ===== 채팅창 스크롤 격리 (body 스크롤 완전 차단) ===== */
  let startY = 0;
  let startScrollTop = 0;
  
  // 1. 채팅 로그 터치 시작
  $log.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
    startScrollTop = $log.scrollTop;
    
    const scrollTop = $log.scrollTop;
    const scrollHeight = $log.scrollHeight;
    const offsetHeight = $log.offsetHeight;
    
    // 끝에서 조금 띄워서 바운스 방지
    if (scrollTop === 0) {
      $log.scrollTop = 1;
    } else if (scrollTop + offsetHeight >= scrollHeight) {
      $log.scrollTop = scrollHeight - offsetHeight - 1;
    }
  }, { passive: true });

  // 2. 채팅 로그 터치 이동 - 핵심 스크롤 처리
  $log.addEventListener('touchmove', (e) => {
    const touch = e.touches[0];
    const currentY = touch.clientY;
    const deltaY = startY - currentY; // 위로 스크롤하면 양수
    
    const scrollTop = $log.scrollTop;
    const scrollHeight = $log.scrollHeight;
    const offsetHeight = $log.offsetHeight;
    
    const isAtTop = scrollTop <= 1;
    const isAtBottom = scrollTop + offsetHeight >= scrollHeight - 1;
    const isScrollingUp = deltaY > 0;
    const isScrollingDown = deltaY < 0;
    
    // 스크롤 끝에서 더 스크롤 시도 시에만 차단
    if ((isAtTop && isScrollingDown) || (isAtBottom && isScrollingUp)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    
    // ⭐ 채팅 로그 내부에서는 자유롭게 스크롤 허용 (preventDefault 호출 안 함)
    // 단, body로의 전파만 차단
    e.stopPropagation();
  }, { passive: false });
  
  // 3. 입력창 터치 시 body 스크롤 완전 차단
  $input.addEventListener('touchstart', (e) => {
    e.stopPropagation();
  }, { passive: true });
  
  $input.addEventListener('touchmove', (e) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }, { passive: false });
  
  // 4. 채팅창 전체 영역에서 body 스크롤 차단
  $wrap.addEventListener('touchmove', (e) => {
    if (!$wrap.classList.contains('active')) return;
    
    // chatLog 내부가 아니면 모든 터치 이동 차단
    if (!e.target.closest('#chatLog')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, { passive: false });

  /* ---------- 유틸: 로그 열기(한 곳에서 관리) ---------- */
  function openLog() {
    if (!$wrap.classList.contains('active')) {
      $wrap.classList.add('active');
      // 모바일에서 body 스크롤 완전 차단
      if (isMobile) {
        disableBodyScroll();
      }
    }
  }
  
  function closeLog() {
    if ($wrap.classList.contains('active')) {
      $wrap.classList.remove('active');
      // body 스크롤 복원
      if (isMobile) {
        enableBodyScroll();
      }
    }
  }

  /* ---------- 공통 렌더 ---------- */
  function row(role, text) {
    const wrap = document.createElement('div');
    wrap.className = `fc-row ${role}`;
    if (role === 'bot') {
      const avatar = document.createElement('div');
      avatar.className = 'fc-avatar';
      wrap.appendChild(avatar);
    }
    const bubble = document.createElement('div');
    bubble.className = 'fc-bubble';

    if (role === 'bot') {
      // ✅ AI 응답은 HTML 그대로 렌더 → <a> 링크 살아남
      bubble.innerHTML = text || '';
    } else {
      // 사용자 메시지는 그냥 텍스트로
      bubble.textContent = text || '';
    }

    wrap.appendChild(bubble);
    $log.appendChild(wrap);
    $log.scrollTop = $log.scrollHeight;
    
    // 메시지 추가 후 body 스크롤 차단 재확인
    if (isMobile && $wrap.classList.contains('active')) {
      requestAnimationFrame(() => {
        disableBodyScroll();
      });
    }
  }


  function renderExtras(r) {
    // 빠른질문
    if (Array.isArray(r.quick) && r.quick.length) {
      const wrap = document.createElement('div');
      wrap.className = 'fc-quick';
      r.quick.forEach(label => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'fc-quick__btn';
        b.textContent = label;
        b.addEventListener('click', async () => {
          openLog();
          $input.value = label;
          await onSend();
        });
        wrap.appendChild(b);
      });
      $log.appendChild(wrap);
    }
    // 링크
    if (Array.isArray(r.links) && r.links.length) {
      const wrap = document.createElement('div');
      wrap.className = 'fc-links';
      r.links.forEach(link => {
        const a = document.createElement('a');
        a.href = link.href;
        a.textContent = link.label || link.href;
        a.className = 'fc-link';
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        wrap.appendChild(a);
      });
      $log.appendChild(wrap);
    }
    $log.scrollTop = $log.scrollHeight;
    
    // extras 렌더링 후에도 body 스크롤 차단 유지
    if (isMobile && $wrap.classList.contains('active')) {
      requestAnimationFrame(() => {
        disableBodyScroll();
      });
    }
  }

  /* ---------- 전송 ---------- */
  async function onSend() {
    const text = ($input.value || '').trim();
    if (!text) return;

    openLog();

    let started = false;
    try {
      started = await ensureStart();
    } catch (e) { /* noop */ }
    if (!started) {
      row('bot', '초기화에 실패했습니다. 다시 시도해 주세요.');
      return;
    }

    row('user', text);
    $input.value = '';

    try {
      const r = await ask(text);
      row('bot', r.reply);
      renderExtras(r);
    } catch (e) {
      row('bot', '요청 처리 중 오류가 발생했습니다.');
    }
  }

  /* ---------- 첫 인사 1회 ---------- */
  let greeted = false;
  async function greetOnce() {
    if (greeted) return;
    greeted = true;

    openLog();

    try {
      await ensureStart();                  // 세션 보장
      const g = await greet();              // $start$ 인사
      row('bot', g.reply);
      renderExtras(g);
    } catch (e) {
      row('bot', '안내 메시지를 불러오지 못했습니다. 질문을 입력해 주세요.');
    }
  }

  /* ---------- 이벤트 ---------- */
  $input.addEventListener('focus', () => { greetOnce().catch(() => { }); openLog(); });
  $input.addEventListener('click', () => { greetOnce().catch(() => { }); openLog(); });

  // Enter 전송: 인사 전이면 먼저 인사 후 전송
  $input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    if (!greeted) {
      greetOnce().then(onSend).catch(onSend);
    } else {
      onSend();
    }
  });

  /* ===== body/html 스크롤 완전 차단 핸들러 ===== */
  function preventBodyScroll(e) {
    // 채팅창 로그 영역이 아니면 모든 터치/스크롤 이동 차단
    if (!e.target.closest('#chatLog')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }
  
  function preventWheel(e) {
    // 채팅창 로그가 아닌 곳에서의 휠 이벤트 차단
    if (!e.target.closest('#chatLog')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }
  
  function preventScroll(e) {
    // 모든 스크롤 이벤트 차단
    if (!e.target.closest('#chatLog')) {
      e.preventDefault();
      return false;
    }
  }

  /* ===== 채팅창 활성화 시 body 클래스 추가 + 스크롤 차단 ===== */
  const observer = new MutationObserver(() => {
    if ($wrap.classList.contains('active')) {
      document.documentElement.classList.add('chat-active');
      document.body.classList.add('chat-active');
      // 모바일에서 즉시 body 스크롤 차단
      if (isMobile) {
        disableBodyScroll();
        // 모든 스크롤 관련 이벤트 차단
        document.body.addEventListener('touchmove', preventBodyScroll, { passive: false });
        document.documentElement.addEventListener('touchmove', preventBodyScroll, { passive: false });
        document.body.addEventListener('wheel', preventWheel, { passive: false });
        document.documentElement.addEventListener('wheel', preventWheel, { passive: false });
        document.body.addEventListener('scroll', preventScroll, { passive: false });
        document.documentElement.addEventListener('scroll', preventScroll, { passive: false });
        window.addEventListener('touchmove', preventBodyScroll, { passive: false });
        window.addEventListener('wheel', preventWheel, { passive: false });
      }
    } else {
      document.documentElement.classList.remove('chat-active');
      document.body.classList.remove('chat-active');
      // 모바일에서 body 스크롤 복원
      if (isMobile) {
        enableBodyScroll();
        // 모든 이벤트 리스너 제거
        document.body.removeEventListener('touchmove', preventBodyScroll);
        document.documentElement.removeEventListener('touchmove', preventBodyScroll);
        document.body.removeEventListener('wheel', preventWheel);
        document.documentElement.removeEventListener('wheel', preventWheel);
        document.body.removeEventListener('scroll', preventScroll);
        document.documentElement.removeEventListener('scroll', preventScroll);
        window.removeEventListener('touchmove', preventBodyScroll);
        window.removeEventListener('wheel', preventWheel);
      }
    }
  });
  observer.observe($wrap, { attributes: true, attributeFilter: ['class'] });

  /* ===== 모바일 키보드 대응 로직 ===== */
  
  if (isMobile) {

    // 입력창 포커스 시 처리
    $input.addEventListener('focus', () => {
      // 키보드가 올라올 때 최신 메시지로 스크롤
      setTimeout(() => {
        if ($log) {
          $log.scrollTop = $log.scrollHeight;
        }
      }, 300); // 키보드 애니메이션 대기
    });

    // 입력창 블러 시 처리
    $input.addEventListener('blur', () => {
      // 키보드 내려갈 때 레이아웃 재조정
      setTimeout(() => {
        if ($log) {
          $log.scrollTop = $log.scrollHeight;
        }
      }, 100);
    });

    // 화면 크기 변경 감지 (키보드 올라오는 것 감지)
    let lastHeight = window.innerHeight;
    window.addEventListener('resize', () => {
      const currentHeight = window.innerHeight;
      const isKeyboardOpen = currentHeight < lastHeight * 0.8;
      
      if (isKeyboardOpen && $wrap.classList.contains('active')) {
        // 키보드가 올라왔을 때 채팅창 스크롤을 맨 아래로
        setTimeout(() => {
          if ($log) {
            $log.scrollTop = $log.scrollHeight;
          }
        }, 100);
      }
      
      lastHeight = currentHeight;
    });

    // iOS Visual Viewport API 지원 (더 정확한 키보드 감지)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => {
        if ($wrap.classList.contains('active') && document.activeElement === $input) {
          // 키보드가 화면을 차지하면 채팅창 최신 메시지로 스크롤
          setTimeout(() => {
            if ($log) {
              $log.scrollTop = $log.scrollHeight;
            }
          }, 50);
        }
      });
    }

    // 메시지 전송 후 자동 스크롤 강화
    const originalRow = row;
    row = function(role, text) {
      const result = originalRow(role, text);
      // 모바일에서는 메시지 추가 후 약간 지연시켜 스크롤
      setTimeout(() => {
        if ($log) {
          $log.scrollTop = $log.scrollHeight;
        }
      }, 50);
      return result;
    };
  }

})();
