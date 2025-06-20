// ==UserScript==
// @name         活动报名插件 V4.0（分页抓取 + 自动 anti-content）
// @namespace    https://yourdomain.com
// @version      4.0.0
// @description  支持短期活动分组抓取，增强抓取商品支持分页与 Headers，自动获取 anti-content
// @match        https://*.kuajingmaihuo.com/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function () {
  'use strict';

  const FULL_COOKIE = `api_uid=CnGDF2hFMdu/OhFcQmzwAg==; dilx=zH3hWrGXMBu9elzJ3-ZFz; _nano_fp=XpmYlpTynpCjnqdyX9_KvaW_n_5~6c7iwo23whca; timezone=Asia%2FShanghai; webp=1; seller_temp=N_eyJ0IjoiV21pN25odFhRanp6T1JCQWFrTDFuelAyZ3IybGQ5ZzExamtWQjAxRVNEckU0QjY1R1NSN2dHT1FrSm94VC9NYy91RHNPbHd0MXNBVFIwWUdUZ2ZRclE9PSIsInYiOjEsInMiOjEwMDAxLCJ1IjoyNDA3NjI2ODY3MzE5OX0=; mallid=634418223153529; _bee=uAKR5aiZPXOOC3GKMaoN5OYhr6zOXapM; njrpl=uAKR5aiZPXOOC3GKMaoN5OYhr6zOXapM; hfsc=L3yPeIg17T361JDMeg==`;
  const style = `
    #moduled-drawer { position: fixed; top: 0; right: 0; width: 780px; height: 100%; background: #fff; border-left: 1px solid #ccc; z-index: 999999; overflow-y: auto; font-family: Arial; box-shadow: -2px 0 8px rgba(0,0,0,0.2); }
    #moduled-drawer h2 { font-size: 18px; padding: 16px; margin: 0; border-bottom: 1px solid #eee; }
    #moduled-close { position: absolute; top: 10px; right: 10px; cursor: pointer; }
    .moduled-section { padding: 16px; border-bottom: 1px solid #eee; }
    .moduled-input-group { margin-bottom: 10px; }
    .moduled-input-group label { display: block; font-size: 14px; margin-bottom: 4px; }
    .moduled-input-group input, .moduled-input-group select { width: 100%; padding: 6px; font-size: 14px; }
    .moduled-tabs { display: flex; margin-bottom: 10px; border-bottom: 1px solid #ccc; }
    .moduled-tab { flex: 1; text-align: center; padding: 8px; cursor: pointer; font-weight: bold; }
    .moduled-tab.active { color: red; border-bottom: 2px solid red; }
    .moduled-tab-panel { display: none; max-height: 300px; overflow-y: auto; }
    .moduled-tab-panel.active { display: block; }
    .moduled-table-header, .moduled-table-row { display: grid; grid-template-columns: 1.5fr 2fr 2fr 1fr 1fr; gap: 10px; padding: 6px 0; align-items: center; }
    .moduled-table-header { font-weight: bold; border-bottom: 1px solid #ccc; margin-bottom: 4px; }
    .moduled-table-row { border-bottom: 1px dashed #ddd; }
  `;
  GM_addStyle(style);

  function createDrawer() {
    if (document.getElementById('moduled-drawer')) return;

    const drawer = document.createElement('div');
    drawer.id = 'moduled-drawer';
    drawer.innerHTML = `
      <h2>活动报名 4.0 <span id="moduled-close">❌</span></h2>
      <div class="moduled-section" id="moduled-settings">
        <div class="moduled-input-group"><label>当前绑定店铺</label><div id="moduled-shop-name">（开发中）</div></div>
        <div class="moduled-input-group">
          <label>活动价格设置方式</label>
          <select id="moduled-price-mode">
            <option value="fixed">活动价格不低于固定值</option>
            <option value="profit">活动利润率不低于固定比例</option>
          </select>
        </div>
        <div class="moduled-input-group"><label id="moduled-price-label">活动价格不低于</label><input type="number" id="moduled-price-input" /></div>
        <div class="moduled-input-group"><label>活动库存数量</label><input type="number" id="moduled-stock-input" /></div>
        <div class="moduled-input-group">
          <label>anti-content（可自动获取）</label>
          <input type="text" id="manual-anti-placeholder" placeholder="自动填充失败时手动填入" />
        </div>
        <div class="moduled-input-group"><label>输入活动ID测试商品抓取</label><input type="text" id="moduled-activity-id-input" placeholder="输入活动ID" /></div>
        <div><button id="moduled-fetch-products">抓取商品数据</button></div>
      </div>
      <div class="moduled-section">
        <strong>长期活动</strong>
        <div id="moduled-long"></div>
      </div>
      <div class="moduled-section">
        <strong>短期活动</strong>
        <div class="moduled-tabs">
          <div class="moduled-tab active" data-tab="0">大促进阶</div>
          <div class="moduled-tab" data-tab="1">秒杀进阶</div>
          <div class="moduled-tab" data-tab="2">清仓进阶</div>
        </div>
        <div id="moduled-short-panels">
          <div class="moduled-tab-panel active" id="moduled-tab-0"></div>
          <div class="moduled-tab-panel" id="moduled-tab-1"></div>
          <div class="moduled-tab-panel" id="moduled-tab-2"></div>
        </div>
      </div>
      <div class="moduled-section" style="text-align:center;">
        <button id="moduled-submit" style="padding:8px 16px;font-size:14px;">立即报名</button>
      </div>
    `;
    document.body.appendChild(drawer);
    document.getElementById('moduled-close').onclick = () => drawer.remove();
    document.getElementById('moduled-price-mode').onchange = function () {
      document.getElementById('moduled-price-label').textContent =
        this.value === 'profit' ? '活动利润率不低于' : '活动价格不低于';
    };
    document.getElementById('manual-anti-placeholder').value = '';

    document.querySelectorAll('.moduled-tab').forEach(tab => {
      tab.onclick = () => {
        document.querySelectorAll('.moduled-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.moduled-tab-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('moduled-tab-' + tab.dataset.tab).classList.add('active');
      };
    });

    document.getElementById('moduled-fetch-products').onclick = () => {
      const actId = document.getElementById('moduled-activity-id-input').value.trim();
      if (actId) fetchProductsRecursive(actId);
    };

    fetchActivityData();
  }

  function fetchActivityData() { /* ... 保留不变 ... */ }
  async function fetchShortTermActivities() { /* ... 保留不变 ... */ }

  function getAntiContent() {
    const inputVal = document.getElementById('manual-anti-placeholder')?.value?.trim();
    if (inputVal) return inputVal;
    const meta = [...document.querySelectorAll('meta')].find(m => m.content?.includes('anti-content'));
    return meta?.content || 'manual-anti-placeholder';
  }

  function fetchProductsRecursive(activityId, scrollContext = "") {
    const cookie = FULL_COOKIE;
    const mallid = '634418223153529';
    const anti = getAntiContent();
    const body = {
      activityType: 13,
      activityThematicId: Number(activityId),
      rowCount: 50,
      addSite: true,
      searchScrollContext: scrollContext || ""
    };

    GM_xmlhttpRequest({
      method: 'POST',
      url: 'https://agentseller.temu.com/api/kiana/gamblers/marketing/enroll/semi/scroll/match',
      headers: {
        'content-type': 'application/json',
        'cookie': cookie,
        'mallid': mallid,
        'referer': `https://agentseller.temu.com/activity/marketing-activity/detail-new?type=13&thematicId=${activityId}`,
        'anti-content': anti,
        'origin': 'https://agentseller.temu.com',
        'user-agent': navigator.userAgent
      },
      data: JSON.stringify(body),
      onload(res) {
        try {
          const json = JSON.parse(res.responseText);
          const list = json?.data?.matchList || [];
          const nextCtx = json?.data?.searchScrollContext || "";
          const hasMore = json?.data?.hasMore || false;

          console.log(`📦 获取商品 ${list.length} 条`, list);

          if (hasMore && nextCtx) {
            setTimeout(() => fetchProductsRecursive(activityId, nextCtx), 1500);
          }
        } catch (err) {
          console.error("❌ 解析失败：", err);
        }
      },
      onerror(err) {
        console.error("❌ 请求错误：", err);
      }
    });
  }

  window.__moduled_plugin__ = () => {
    createDrawer();
  };
})();
