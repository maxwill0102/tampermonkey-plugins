// ==UserScript==
// @name         活动报名插件 V3.7（增强版）
// @namespace    https://yourdomain.com
// @version      3.7.0
// @description  支持长期+短期活动展示，抓取可报名商品，控制台输出，Anti-Content、Cookie头完整处理
// @match        https://*.kuajingmaihuo.com/*
// @match        https://agentseller.temu.com/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @connect      agentseller.temu.com
// ==/UserScript==

(function () {
  'use strict';

  const FULL_COOKIE = `api_uid=CnGDF2hFMdu/OhFcQmzwAg==; dilx=zH3hWrGXMBu9elzJ3-ZFz; _nano_fp=XpmYlpTynpCjnqdyX9_KvaW_n_5~6c7iwo23whca; timezone=Asia%2FShanghai; webp=1; _bee=7uIHozziQLQMoPIvyIDALbcXydKkca0H; njrpl=7uIHozziQLQMoPIvyIDALbcXydKkca0H; hfsc=L3yOcYo27Dz50ZTOcQ==; seller_temp=N_eyJ0IjoiTmFZT3BxbUpxTk0wMTl4dGw4NVRmVjdOTENPRnNsWFE2QUNlKzZsNU84RDZUbjFoQkVURXUzdE5NSVE5eE43LzV3TUFzbG9iNm9taHc5Tzd0enlRNGc9PSIsInYiOjEsInMiOjEwMDAxLCJ1IjoyNDA3NjI2ODY3MzE5OX0=; mallid=634418223153529`;
  const ANTI_CONTENT = `0aqAfoixYySYj9E2J0didyxgjRAwIqP2ID3kKGzdvqe84kyjIs4HyQfYOmjkrrze-crCiTnixgSUJIf0UKVZgmvQ75Eo_Bl6DEfLU9TF9-475E8cqUGNjYTATLJVJJqWySNB6kUA-xv1ltrWo4j80KfDIeHrC4H_5ekuK9QxQhAxvj9Q_P7hDAT4RTMrofxM5qYQUWAPzhC0WP-cTojUGQUfhZBM448owrxCtZ01vN9jxWjo087lM5hcCnRcBL02IflDP6slH4jZfiC0WUuiDbCQaXnHP7N_2x4t8H9RY2Xbs7UzRP17UlcguQbXRT1XElhr0AuaDJRDMSn88Ai5HNunGj2yyqMNtAcvWouNUwqAud9jnG__Z_Exp1l7pVnYYSB-Ub2L5IXRayS5QKvxL9vyu6BntuXBYSR2a8nqQ5RwjMStfIcXj6a5sljEe5FpqKek4ZlKK3GVq-2gw-2b_dcP0s_PPp3DKJuLtomM_QrzMFzESn2Ues4L4ZfSSRvdfXpV90GmEsbKvnlyvbJdmKkAmwpH-GzctDI4Z8bBkSO1eFK1yZCGZTSFhgq6wTtag96vwP0rvpgOMzEVgnwqkgs7hGqPOdzrdhgqKRZu4Y61vLS31aj1ZcDOoaPHL52nPmkd4bKAA8W_LvnOSy28dLdpDOIj2afFRvTt51-fsn-_ICH1KfzO0ZR-szvBDmKjJB_QffwpggAygXKvEYnFkTP5gWr28VB64SU3lrVVNArqnrc6ZrDgYcQYVAqQz1JXvLXeXGVaRTGqi8K1eWqLiVWK0ronxlyU2gJ`; // 🔁 替换为抓包得到的 Anti-Content

  const style = `
    #moduled-drawer { position:fixed; top:0; right:0; width:780px; height:100%; background:#fff; border-left:1px solid #ccc; z-index:999999; overflow-y:auto; font-family:Arial; box-shadow:-2px 0 8px rgba(0,0,0,0.2); }
    #moduled-drawer h2 { font-size:18px; padding:16px; margin:0; border-bottom:1px solid #eee; }
    #moduled-close { position:absolute; top:10px; right:10px; cursor:pointer; }
    .moduled-section { padding:16px; border-bottom:1px solid #eee; }
    .moduled-input-group { margin-bottom:10px; }
    .moduled-input-group label { display:block; font-size:14px; margin-bottom:4px; }
    .moduled-input-group input { width:100%; padding:6px; font-size:14px; }
    .moduled-table-header, .moduled-table-row { display:grid; grid-template-columns:1.5fr 2fr 2fr 1fr 1fr; gap:10px; padding:6px 0; align-items:center; }
    .moduled-table-header { font-weight:bold; border-bottom:1px solid #ccc; margin-bottom:4px; }
    .moduled-tab-panel.active { display:block; }
  `;
  GM_addStyle(style);

  function fetchProducts(activityId, scrollContext = "") {
    const data = {
      activityType: 13,
      activityThematicId: Number(activityId),
      rowCount: 50,
      addSite: true,
      searchScrollContext: scrollContext
    };

    console.log("📦 [抓取商品] 请求参数:", data);

    GM_xmlhttpRequest({
  method: 'POST',
  url: 'https://agentseller.temu.com/api/kiana/gamblers/marketing/enroll/semi/scroll/match',
  headers: {
    'content-type': 'application/json',
    'anti-content': ANTI_CONTENT,
    'cookie': FULL_COOKIE,
    'mallid': '634418223153529'
    // ⚠️ 删除 referer 和 user-agent（更安全）
  },
  data: JSON.stringify({
    activityType: 13,
    activityThematicId: Number(activityId),
    rowCount: 50,
    addSite: true,
    searchScrollContext: scrollContext
  }),
  onload: function (res) {
    if (res.status === 200) {
      try {
        const json = JSON.parse(res.responseText);
        const list = json?.data?.matchList || [];
        const nextCtx = json?.data?.searchScrollContext;
        console.log("🎯 可报名商品数据：", list);
        console.log("📌 下一页上下文：", nextCtx);
      } catch (e) {
        console.error("❌ JSON解析失败", e);
      }
    } else {
      console.error("❌ 请求失败，状态码：", res.status, res.responseText);
    }
  },
  onerror: function (err) {
    console.error("❌ 网络错误：", err);
  }
});
  }

  function addProductFetcherUI() {
    const container = document.createElement('div');
    container.className = 'moduled-section';
    container.innerHTML = `
      <strong>🎯 抓取商品工具</strong>
      <div class="moduled-input-group">
        <label>活动ID</label>
        <input type="text" id="moduled-activity-id" placeholder="如：2506050372470749" />
      </div>
      <button id="moduled-fetch-btn" style="padding:6px 12px;">开始抓取</button>
    `;
    document.getElementById('moduled-drawer')?.appendChild(container);
    document.getElementById('moduled-fetch-btn').onclick = () => {
      const actid = document.getElementById('moduled-activity-id')?.value?.trim();
      if (!actid) return alert('请输入活动ID');
      fetchProducts(actid);
    };
  }

  function createDrawer() {
    if (document.getElementById('moduled-drawer')) return;
    const el = document.createElement('div');
    el.id = 'moduled-drawer';
    el.innerHTML = `<h2>活动报名 3.7 <span id="moduled-close">❌</span></h2>`;
    document.body.appendChild(el);
    document.getElementById('moduled-close').onclick = () => el.remove();
    addProductFetcherUI();
  }

  window.__moduled_plugin__ = () => {
    createDrawer();
  };
})();
