/**
 * Page slide transition
 * EXIT  — sky-blue panel slides in from the left, covering the current page
 * ENTRY — panel slides out to the right, revealing the new page
 */
(function () {
    var EXIT_MS  = 440;
    var ENTER_MS = 500;
    var EASE = 'cubic-bezier(0.77, 0, 0.175, 1)';

    /* ── overlay element ─────────────────────────────────────────────── */
    var style = document.createElement('style');
    style.textContent = [
        '#__pg-ov {',
        '  position:fixed; inset:0; z-index:999999;',
        '  background:linear-gradient(135deg,#0ea5e9 0%,#0284c7 100%);',
        '  display:flex; align-items:center; justify-content:center;',
        '  will-change:transform;',
        '}',
        '#__pg-ov img {',
        '  width:70px; height:70px; border-radius:50%; object-fit:cover;',
        '  border:2px solid rgba(255,255,255,.35);',
        '  box-shadow:0 0 40px rgba(255,255,255,.18);',
        '}'
    ].join('');
    document.head.appendChild(style);

    var ov = document.createElement('div');
    ov.id = '__pg-ov';
    /* starts visible — covers screen so entry can sweep it away */
    ov.style.cssText = 'transform:translateX(0);pointer-events:none;';

    var logo = document.createElement('img');
    logo.src = 'Images/logo1.jpg';
    logo.alt = '';
    logo.style.cssText = 'opacity:0;transform:scale(.85);transition:opacity .22s,transform .22s;';
    ov.appendChild(logo);
    document.body.appendChild(ov);

    /* ── ENTRY: sweep overlay off to the right ───────────────────────── */
    function runEntry() {
        /* brief logo flash */
        logo.style.opacity = '1';
        logo.style.transform = 'scale(1)';

        setTimeout(function () {
            logo.style.opacity = '0';
            logo.style.transform = 'scale(.85)';

            setTimeout(function () {
                ov.style.transition = 'transform ' + ENTER_MS + 'ms ' + EASE;
                ov.style.transform  = 'translateX(100%)';
            }, 160);
        }, 340);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runEntry);
    } else {
        requestAnimationFrame(runEntry);
    }

    /* ── EXIT: intercept link clicks ─────────────────────────────────── */
    var navigating = false; /* guard against double-clicks */

    document.addEventListener('click', function (e) {
        if (navigating) return;

        var link = e.target.closest('a[href]');
        if (!link) return;

        var href = link.getAttribute('href');
        if (!href) return;

        /* skip non-page links */
        if (
            href.charAt(0) === '#'        ||
            href.indexOf('http')  === 0   ||
            href.indexOf('//')    === 0   ||
            href.indexOf('mailto') === 0  ||
            href.indexOf('tel:')  === 0   ||
            href.indexOf('javascript') === 0 ||
            link.getAttribute('target') === '_blank' ||
            link.getAttribute('data-bs-toggle')
        ) return;

        e.preventDefault();
        navigating = true;

        /* 1. disable transition so the position snap is instant */
        ov.style.transition = 'none';
        ov.style.transform  = 'translateX(-100%)';
        ov.style.pointerEvents = 'all';

        /* 2. getBoundingClientRect() forces a synchronous layout —
              the snap above is guaranteed to be applied before we
              add the transition in the next rAF */
        requestAnimationFrame(function () {
            ov.getBoundingClientRect(); /* flush layout */

            ov.style.transition = 'transform ' + EXIT_MS + 'ms ' + EASE;
            ov.style.transform  = 'translateX(0)';

            setTimeout(function () {
                window.location.href = href;
            }, EXIT_MS);
        });
    });
})();
