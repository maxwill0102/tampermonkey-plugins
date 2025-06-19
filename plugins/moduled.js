// ==UserScript==
// @name         活动报名插件 V3.7（抓取商品增强）
// @namespace    https://yourdomain.com
// @version      3.7.0
// @description  支持短期活动分组抓取，新增商品数据递归抓取，自动分页
// @match        https://*.kuajingmaihuo.com/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @connect      agentseller.temu.com
// ==/UserScript==

(function () {
  'use strict';

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
    .moduled-table-header, .moduled-table-row {
      display: grid; grid-template-columns: 1.5fr 2fr 2fr 1fr 1fr;
      gap: 10px; padding: 6px 0; align-items: center;
    }
    .moduled-table-header { font-weight: bold; border-bottom: 1px solid #ccc; margin-bottom: 4px; }
    .moduled-table-row { border-bottom: 1px dashed #ddd; }
  `;
  GM_addStyle(style);

  function createDrawer() {
    if (document.getElementById('moduled-drawer')) return;

    const drawer = document.createElement('div');
    drawer.id = 'moduled-drawer';
    drawer.innerHTML = `
      <h2>活动报名 3.7 <span id="moduled-close">❌</span></h2>
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
        <div class="moduled-input-group"><label>抓取商品活动ID</label><input type="text" id="moduled-activity-id" placeholder="请输入活动ID" /></div>
        <button id="moduled-fetch-products" style="padding:6px 12px;margin-top:8px;">🎯 获取商品</button>
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
    document.querySelectorAll('.moduled-tab').forEach(tab => {
      tab.onclick = () => {
        document.querySelectorAll('.moduled-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.moduled-tab-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('moduled-tab-' + tab.dataset.tab).classList.add('active');
      };
    });
    document.getElementById('moduled-fetch-products').onclick = fetchAllMatchProducts;
    fetchActivityData();
  }

  function fetchActivityData() {
    const longList = document.querySelectorAll('.act-item_actItem__x2Uci');
    const longContainer = document.getElementById('moduled-long');
    longContainer.innerHTML = '<div class="moduled-table-header"><div>活动类型</div><div>活动说明</div><div>是否报名</div></div>';
    longList.forEach((el, index) => {
      const name = el.querySelector('.act-item_activityName__Ryh3Y')?.innerText?.trim() || '';
      const desc = el.querySelector('.act-item_activityContent__ju2KR')?.innerText?.trim() || '';
      const checkboxId = `long-chk-${index}`;
      longContainer.innerHTML += `
        <div class="moduled-table-row">
          <div>${name}</div>
          <div>${desc}</div>
          <div><input type="checkbox" id="${checkboxId}" /></div>
        </div>`;
    });
    fetchShortTermActivities();
  }

  async function fetchShortTermActivities() {
    const shortPanelRoots = [
      document.getElementById('moduled-tab-0'),
      document.getElementById('moduled-tab-1'),
      document.getElementById('moduled-tab-2'),
    ];
    const tabWrapperList = document.querySelectorAll('.TAB_tabContentInnerContainer_5-118-0');
    const tabContainer = tabWrapperList.length >= 2 ? tabWrapperList[1] : null;
    if (!tabContainer) return console.warn('❌ 未找到短期活动 tab');

    const tabs = tabContainer.querySelectorAll('[data-testid="beast-core-tab-itemLabel-wrapper"]');
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    for (let i = 0; i < tabs.length; i++) {
      tabs[i].click();
      await delay(800);

      const container = shortPanelRoots[i] || shortPanelRoots[0];
      container.innerHTML = `
        <div class="moduled-table-header">
          <div>活动主题</div>
          <div>报名时间</div>
          <div>活动时间</div>
          <div>已报名</div>
          <div>是否报名</div>
        </div>
      `;

      const rows = document.querySelectorAll('[data-testid="beast-core-table-body-tr"]');
      rows.forEach((row, index) => {
        const cells = row.querySelectorAll('[data-testid="beast-core-table-td"]');
        if (cells.length >= 5) {
          const title = cells[0].innerText.trim();
          const applyTime = cells[1].innerText.trim();
          const actTime = cells[2].innerText.trim();
          const joined = cells[3].innerText.trim();
          const checkboxId = `short-chk-${i}-${index}`;

          container.innerHTML += `
            <div class="moduled-table-row">
              <div>${title}</div>
              <div>${applyTime}</div>
              <div>${actTime}</div>
              <div>${joined}</div>
              <div><input type="checkbox" id="${checkboxId}" /></div>
            </div>
          `;
        }
      });
    }
  }

  function fetchAllMatchProducts() {
    const id = document.getElementById('moduled-activity-id')?.value.trim();
    if (!id) return alert('请输入活动ID');
    let page = 1;
    let scrollCtx = "";
    let hasMore = true;
    let allItems = [];

    const doFetch = () => {
      const postData = {
        activityType: 13,
        activityThematicId: Number(id),
        rowCount: 50,
        addSite: true,
        searchScrollContext: scrollCtx
      };

      console.log("📦 [抓取商品] 请求参数:", postData);

      GM_xmlhttpRequest({
        method: 'POST',
        url: 'https://agentseller.temu.com/api/kiana/gamblers/marketing/enroll/semi/scroll/match',
        headers: {
          'Content-Type': 'application/json',
          'Anti-Content': '0aqAfoixYySYj9E2J0didyxgjRAwIqP2ID3kKGzdvqe84kyjIs4HyQfYOmjkrrze-crCiTnixgSUJIf0UKVZgmvQ75Eo_Bl6DEfLU9TF9-475E8cqUGNjYTATLJVJJqWySNB6kUA-xv1ltrWo4j80KfDIeHrC4H_5ekuK9QxQhAxvj9Q_P7hDAT4RTMrofxM5qYQUWAPzhC0WP-cTojUGQUfhZBM448owrxCtZ01vN9jxWjo087lM5hcCnRcBL02IflDP6slH4jZfiC0WUuiDbCQaXnHP7N_2x4t8H9RY2Xbs7UzRP17UlcguQbXRT1XElhr0AuaDJRDMSn88Ai5HNunGj2yyqMNtAcvWouNUwqAud9jnG__Z_Exp1l7pVnYYSB-Ub2L5IXRayS5QKvxL9vyu6BntuXBYSR2a8nqQ5RwjMStfIcXj6a5sljEe5FpqKek4ZlKK3GVq-2gw-2b_dcP0s_PPp3DKJuLtomM_QrzMFzESn2Ues4L4ZfSSRvdfXpV90GmEsbKvnlyvbJdmKkAmwpH-GzctDI4Z8bBkSO1eFK1yZCGZTSFhgq6wTtag96vwP0rvpgOMzEVgnwqkgs7hGqPOdzrdhgqKRZu4Y61vLS31aj1ZcDOoaPHL52nPmkd4bKAA8W_LvnOSy28dLdpDOIj2afFRvTt51-fsn-_ICH1KfzO0ZR-szvBDmKjJB_QffwpggAygXKvEYnFkTP5gWr28VB64SU3lrVVNArqnrc6ZrDgYcQYVAqQz1JXvLXeXGVaRTGqi8K1eWqLiVWK0ronxlyU2gJ' // 如需加上最新值请替换
        },
        data: JSON.stringify(postData),
        onload: function (res) {
          try {
            const json = JSON.parse(res.responseText);
            const list = json?.data?.matchList || [];
            scrollCtx = json?.data?.searchScrollContext || '';
            hasMore = json?.data?.hasMore;
            allItems = allItems.concat(list);
            console.log(`📄 第${page++}页：`, list);
            if (hasMore) {
              doFetch();
            } else {
              console.log('✅ 所有商品加载完毕，共：', allItems.length);
            }
          } catch (err) {
            console.error('❌ 抓取失败：', err);
          }
        },
        onerror: function (e) {
          console.error('❌ 网络请求失败：', e);
        }
      });
    };
    doFetch();
  }

  window.__moduled_plugin__ = () => {
    createDrawer();
  };
})();
