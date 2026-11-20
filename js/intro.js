// ===== オープニング演出（初回のみ） =====
// 流れ: アイコンが中央に出る → 左上(ナビのロゴ位置)へ飛ぶ → 中央からひびが走る →
//       画面が砕けて Hero が現れる → ナビのリンクが左から順に落ちてくる／名前が左へ寄りながら出る／
//       Works ボタンが下から上がってくる
// 出すかどうかは index.html の先頭インラインスクリプトが判定し、html.intro-pending で伝える。
(function initIntro() {
    const html = document.documentElement;
    if (!html.classList.contains('intro-pending')) return;

    const root = document.getElementById('intro');
    const shardWrap = document.getElementById('intro-shards');
    const svg = document.getElementById('intro-cracks');
    const logo = document.getElementById('intro-logo');
    const navIcon = document.querySelector('.nav-logo-icon');
    if (!root || !shardWrap || !svg || !logo || !navIcon) { html.classList.remove('intro-pending'); return; }

    // --- 時間割（ms） ---
    const T_LOGO_IN = 60, D_LOGO_IN = 400;
    const T_FLY = 520, D_FLY = 620;
    const T_LAND = T_FLY + D_FLY;          // 1140: ナビのロゴと入れ替え
    const T_CRACK = T_LAND + 20, D_CRACK = 360;
    const T_SHATTER = T_CRACK + D_CRACK - 20;
    const T_NAV = T_SHATTER + 40;
    const T_HERO = T_SHATTER + 80;
    const T_BTN = T_SHATTER + 240;
    const T_END = T_SHATTER + 1050;

    const W = window.innerWidth, H = window.innerHeight;
    const cx = W / 2, cy = H / 2;
    const RMAX = Math.hypot(cx, cy);        // 中心から画面の角まで
    const ROUT = RMAX * 2.1;                // 一番外側の殻（画面外まで覆う）
    const WEDGES = 14;                      // 中心から放射状に割る数
    const RING_REL = [0.28, 0.55, 0.86];    // 画面内に見えるリングの境界（RMAX 比）
    const RINGS = RING_REL.length + 1;      // + 画面外まで伸びる殻
    const rnd = (a, b) => a + Math.random() * (b - a);
    const pt = (ang, r) => [cx + Math.cos(ang) * r, cy + Math.sin(ang) * r];

    const timers = [];
    const later = (ms, fn) => timers.push(setTimeout(fn, ms));

    // 破片の境界点をひとつの表にまとめ、破片の輪郭とひび割れの線で同じ座標を使う
    // （別々に作ると線が割れ目からずれて、ただの放射状の線に見えてしまう）
    const baseAng = [];
    for (let i = 0; i < WEDGES; i++) baseAng.push((i / WEDGES) * Math.PI * 2 + rnd(-0.12, 0.12));
    const B = [];   // B[i][k] = 境界 i・リング k の点
    for (let i = 0; i < WEDGES; i++) {
        B[i] = [];
        for (let k = 0; k < RINGS; k++) {
            const last = k === RINGS - 1;
            const r = last ? ROUT : RMAX * RING_REL[k] * rnd(0.84, 1.16);
            B[i][k] = pt(baseAng[i] + rnd(-0.05 - k * 0.04, 0.05 + k * 0.04), r);
        }
    }
    const nx = i => (i + 1) % WEDGES;
    const px = p => p[0].toFixed(1) + 'px ' + p[1].toFixed(1) + 'px';

    // --- 破片を作る ---
    const shards = [];
    const frag = document.createDocumentFragment();
    for (let i = 0; i < WEDGES; i++) {
        const j = nx(i);
        const mid = Math.atan2((B[i][0][1] + B[j][0][1]) / 2 - cy, (B[i][0][0] + B[j][0][0]) / 2 - cx);
        for (let k = 0; k < RINGS; k++) {
            const poly = k === 0
                ? [[cx, cy], B[i][0], B[j][0]]
                : [B[i][k - 1], B[j][k - 1], B[j][k], B[i][k]];
            const d = document.createElement('div');
            d.className = 'intro-shard';
            d.style.clipPath = 'polygon(' + poly.map(px).join(',') + ')';
            // 向きごとにわずかな艶を乗せて、割れ目が見えるようにする
            // 背景と同色のままだと割れ目が見えないので、向きごとに艶の出方を変えて面を立たせる
            d.style.backgroundImage = 'linear-gradient(' + Math.round((mid * 180 / Math.PI) + 90) +
                'deg, rgba(255,255,255,0.11), rgba(255,255,255,0.012) 52%, rgba(255,68,68,0.06))';
            frag.appendChild(d);
            shards.push({ el: d, ang: mid, ring: k });
        }
    }
    shardWrap.appendChild(frag);

    // --- ひび割れの線（破片の輪郭と同じ座標をなぞる） ---
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    const NS = 'http://www.w3.org/2000/svg';
    const paths = [];
    function addPath(d) {
        // 下に赤いにじみ、上に白い芯の2本重ねで「光る亀裂」に見せる
        [['rgba(255,68,68,0.5)', 3.2], ['rgba(255,255,255,0.85)', 1.1]].forEach(function (pair) {
            const p = document.createElementNS(NS, 'path');
            p.setAttribute('d', d);
            p.setAttribute('fill', 'none');
            p.setAttribute('stroke', pair[0]);
            p.setAttribute('stroke-width', pair[1]);
            p.setAttribute('stroke-linecap', 'round');
            p.setAttribute('stroke-linejoin', 'round');
            svg.appendChild(p);
            paths.push(p);
        });
    }
    const L = p => p[0].toFixed(1) + ' ' + p[1].toFixed(1);
    for (let i = 0; i < WEDGES; i++) {
        // 中心から外へ、リングごとに折れながら伸びる亀裂
        let d = 'M ' + cx.toFixed(1) + ' ' + cy.toFixed(1);
        for (let k = 0; k < RINGS - 1; k++) d += ' L ' + L(B[i][k]);
        addPath(d);
        // 隣の亀裂へ渡る横の割れ目（画面内のリングのみ）
        for (let k = 0; k < RINGS - 2; k++) addPath('M ' + L(B[i][k]) + ' L ' + L(B[nx(i)][k]));
    }
    // 中心から外へ描かれていくように、線の長さぶんだけオフセットを付けておく
    paths.forEach(p => {
        const len = p.getTotalLength();
        p.style.strokeDasharray = len;
        p.style.strokeDashoffset = len;
    });

    // 砕けた瞬間に中央から一度だけ光らせる
    const flash = document.createElement('div');
    flash.className = 'intro-flash';
    root.appendChild(flash);

    // --- アイコン：ナビのロゴ位置を実測し、そこへ着地させる ---
    const target = navIcon.getBoundingClientRect();
    const size = target.height || 60;
    logo.style.left = target.left + 'px';
    logo.style.top = target.top + 'px';
    logo.style.width = target.width + 'px';
    logo.style.height = target.height + 'px';
    const bigH = Math.min(H * 0.26, 190);               // 中央に出すときの大きさ
    const scale = Math.max(bigH / size, 1);
    const dx = cx - (target.left + target.width / 2);
    const dy = cy - (target.top + target.height / 2);
    const at = s => 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) scale(' + s.toFixed(3) + ')';
    const atCenter = at(scale);
    // 開始と終了で transform の関数列を揃える（列が違うと行列補間になり、拡大中に中心がずれる）
    logo.style.transform = at(scale * 0.82);

    let done = false;
    function finish() {
        if (done) return;
        done = true;
        timers.forEach(clearTimeout);
        html.classList.remove('intro-pending', 'intro-landed', 'intro-nav', 'intro-hero', 'intro-btn');
        root.remove();
        logo.remove();
        window.removeEventListener('pointerdown', finish);
        window.removeEventListener('keydown', finish);
    }
    // 待たされたくない人のために、クリックやキー操作で即スキップできるようにしておく
    window.addEventListener('pointerdown', finish);
    window.addEventListener('keydown', finish);

    // --- 時間割の実行 ---
    later(T_LOGO_IN, () => {
        logo.style.transition = 'opacity ' + D_LOGO_IN + 'ms ease, transform ' + D_LOGO_IN + 'ms cubic-bezier(0.2,0.8,0.3,1)';
        logo.style.opacity = '1';
        logo.style.transform = atCenter;
    });
    later(T_FLY, () => {
        logo.style.transition = 'transform ' + D_FLY + 'ms cubic-bezier(0.6,0,0.25,1)';
        logo.style.transform = 'none';
    });
    later(T_LAND, () => {
        html.classList.add('intro-landed');     // ナビの本物のロゴを出す
        logo.style.transition = 'opacity 0.2s ease';
        logo.style.opacity = '0';
    });
    later(T_CRACK, () => {
        svg.style.opacity = '1';
        paths.forEach((p, i) => {
            p.style.transition = 'stroke-dashoffset ' + D_CRACK + 'ms cubic-bezier(0.3,0,0.2,1) ' + (i % 7) * 12 + 'ms';
            p.style.strokeDashoffset = '0';
        });
    });
    later(T_SHATTER, () => {
        svg.style.opacity = '0';   // ひびは砕けると同時に消す（インライン指定なのでクラスでは上書きできない）
        root.style.background = 'transparent';   // 地の色を外して、破片の隙間から Hero を見せる
        flash.style.opacity = '1';
        requestAnimationFrame(() => { flash.style.opacity = '0'; });
        shards.forEach(s => {
            const dist = RMAX * (0.7 + s.ring * 0.45) * rnd(0.85, 1.2);
            const tx = Math.cos(s.ang) * dist;
            const ty = Math.sin(s.ang) * dist + RMAX * 0.3;   // 少し落下方向に寄せる
            const delay = s.ring * 55 + rnd(0, 80);
            s.el.style.transition =
                'transform 950ms cubic-bezier(0.25,0.46,0.45,0.94) ' + delay.toFixed(0) + 'ms, ' +
                'opacity 820ms ease-in ' + (delay + 260).toFixed(0) + 'ms';
            s.el.style.transform =
                'translate3d(' + tx.toFixed(0) + 'px,' + ty.toFixed(0) + 'px,0) rotate(' + rnd(-70, 70).toFixed(1) + 'deg) scale(0.86)';
            s.el.style.opacity = '0';
        });
    });
    later(T_NAV, () => html.classList.add('intro-nav'));
    later(T_HERO, () => html.classList.add('intro-hero'));
    later(T_BTN, () => html.classList.add('intro-btn'));
    later(T_END, finish);
})();
