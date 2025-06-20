// ==UserScript==
// @name         活动报名插件 V4.3.1（修复 renderSubmitPage）
// @namespace    https://yourdomain.com
// @version      4.3.1
// @description  支持短期/长期活动展示 + 商品抓取 + 报名详情页 + 校验 + 关闭返回
// @match        https://*.kuajingmaihuo.com/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
  'use strict';

  // 样式保持不变
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

  let selectedActivities = [];

  /** 渲染报名详情页内容，覆盖抽屉内HTML */
  function renderSubmitPage(config) {
    const container = document.getElementById('moduled-drawer');
    if (!container) return;
    container.innerHTML = `
      <h2>报名详情页 <span id="moduled-close">❌</span></h2>
      <div class="moduled-section">
        <p>价格方式：${config.mode === 'profit' ? '利润率不低于' : '价格不低于固定值'} ${config.priceVal}</p>
        <p>活动库存：${config.stockVal || '默认'}</p>
      </div>
      <div class="moduled-section">
        <p>当前活动：1 / ${config.total}</p>
        <p>报名成功：0 / 0</p>
        <p>未报名数量：0</p>
      </div>
      <div class="moduled-section">
        <table border="1" cellspacing="0" cellpadding="5" width="100%">
          <thead>
            <tr><th>商品标题</th><th>SKC</th><th>日常价格</th><th>活动申报价格</th><th>是否满足报名条件</th><th>活动库存</th><th>是否报名成功</th></tr>
          </thead>
          <tbody id="product-rows">
            <tr><td colspan="7" align="center">等待数据填充...</td></tr>
          </tbody>
        </table>
      </div>
      <div class="moduled-section" style="text-align:center">
        <button id="pause-btn">暂停</button>
      </div>
    `;
    // 关闭按钮恢复抽屉
    document.getElementById('moduled-close').onclick = () => createDrawer();
  }

  /** 抓取并渲染长期活动列表 */
  function fetchActivityData() {
    const longContainer = document.getElementById('moduled-long');
    if (!longContainer) return;
    longContainer.innerHTML = '<div class="moduled-table-header"><div>类型</div><div>说明</div><div>是否报名</div></div>';
    document.querySelectorAll('.act-item_actItem__x2Uci').forEach((el, idx) => {
      const name = el.querySelector('.act-item_activityName__Ryh3Y')?.innerText.trim() || '';
      const desc = el.querySelector('.act-item_activityContent__ju2KR')?.innerText.trim() || '';
      longContainer.innerHTML += `<div class="moduled-table-row"><div>${name}</div><div>${desc}</div><div><input type="checkbox" id="long-${idx}" /></div></div>`;
    });
  }

  /** 抓取并渲染短期活动各分类 */
  async function fetchShortTermActivities() {
    const panels = [0,1,2].map(i => document.getElementById('moduled-tab-'+i));
    const roots = document.querySelectorAll('.TAB_tabContentInnerContainer_5-118-0');
    if (roots.length < 2) return;
    const tabs = roots[1].querySelectorAll('[data-testid="beast-core-tab-itemLabel-wrapper"]');
    const delay = ms=>new Promise(r=>setTimeout(r,ms));
    for (let i=0; i<tabs.length; i++) {
      tabs[i].click();
      await delay(800);
      const panel = panels[i];
      panel.innerHTML = '<div class="moduled-table-header"><div>主题</div><div>报名时间</div><div>活动时间</div><div>已报名</div><div>是否报名</div></div>';
      document.querySelectorAll('[data-testid="beast-core-table-body-tr"]').forEach((row,j) => {
        const cells = row.querySelectorAll('[data-testid="beast-core-table-td"]');
        if (cells.length >= 5) {
          panel.innerHTML += `<div class="moduled-table-row"><div>${cells[0].innerText.trim()}</div><div>${cells[1].innerText.trim()}</div><div>${cells[2].innerText.trim()}</div><div>${cells[3].innerText.trim()}</div><div><input type="checkbox" id="short-${i}-${j}" /></div></div>`;
        }
      });
    }
  }

  /** 商品分页抓取逻辑（省略，可保留已有版本） */
  function fetchProducts(activityId, scrollContext = "") {
    // …原 fetchProducts 实现…
  }

  /** 构建并显示抽屉内容 */
  function createDrawer() {
    const existing = document.getElementById('moduled-drawer');
    if (existing) existing.remove();
    const drawer = document.createElement('div');
    drawer.id = 'moduled-drawer';
    drawer.innerHTML = `
      <h2>活动报名 4.3 <span id="moduled-close">❌</span></h2>
      <div class="moduled-section" id="moduled-settings">
        <div class="moduled-input-group"><label>当前绑定店铺</label><div id="moduled-shop-name">（开发中）</div></div>
        <div class="moduled-input-group">
          <label>活动价格设置方式</label>
          <select id="moduled-price-mode">
            <option value="fixed">活动价格不低于固定值</option>
            <option value="profit">活动利润率不低于固定比例</option>
          </select>
        </div>
        <div class="moduled-input-group">
          <label id="moduled-price-label">活动价格不低于</label>
          <input type="number" id="moduled-price-input" placeholder="必填" />
        </div>
        <div class="moduled-input-group"><label>活动库存数量</label><input type="number" id="moduled-stock-input" /></div>
        <div class="moduled-input-group"><label>输入活动ID测试商品抓取</label><input type="text" id="moduled-activity-id-input" placeholder="输入活动ID" /></div>
        <div><button id="moduled-fetch-products">抓取商品数据</button></div>
      </div>
      <div class="moduled-section"><strong>长期活动</strong><div id="moduled-long"></div></div>
      <div class="moduled-section"><strong>短期活动</strong><div class="moduled-tabs"><div class="moduled-tab active" data-tab="0">大促进阶</div><div class="moduled-tab" data-tab="1">秒杀进阶</div><div class="moduled-tab" data-tab="2">清仓进阶</div></div><div id="moduled-short-panels"><div class="moduled-tab-panel active" id="moduled-tab-0"></div><div class="moduled-tab-panel" id="moduled-tab-1"></div><div class="moduled-tab-panel" id="moduled-tab-2"></div></div></div>
      <div class="moduled-section" style="text-align:center;"><button id="moduled-submit" style="padding:8px 16px;font-size:14px;">立即报名</button></div>
    `;
    document.body.appendChild(drawer);

    // 绑定关闭
    document.getElementById('moduled-close').onclick = () => drawer.remove();
    // 价格模式切换
    document.getElementById('moduled-price-mode').onchange = function() {
      document.getElementById('moduled-price-label').textContent = this.value==='profit'? '活动利润率不低于':'活动价格不低于';
    };
    // 短期Tab切换
    document.querySelectorAll('.moduled-tab').forEach(tab=>{tab.onclick=()=>{document.querySelectorAll('.moduled-tab').forEach(t=>t.classList.remove('active'));document.querySelectorAll('.moduled-tab-panel').forEach(p=>p.classList.remove('active'));tab.classList.add('active');document.getElementById('moduled-tab-'+tab.dataset.tab).classList.add('active');}});
    // 抓取商品按钮
    setTimeout(()=>{const btn=document.getElementById('moduled-fetch-products'); if(btn)btn.onclick=()=>{const id=document.getElementById('moduled-activity-id-input').value.trim(); if(id)fetchProducts(id);else alert('请输入活动ID');};},300);
    // 渲染活动列表
    fetchActivityData();fetchShortTermActivities();
    // 提交报名按钮
    document.getElementById('moduled-submit').onclick = ()=>{
      const priceVal=document.getElementById('moduled-price-input').value.trim(); if(!priceVal)return alert('请填写活动价格');
      const mode=document.getElementById('moduled-price-mode').value;
      const stockVal=document.getElementById('moduled-stock-input').value.trim();
      const checked=Array.from(document.querySelectorAll('input[type="checkbox"]:checked'));
      selectedActivities=checked.map(el=>el.id);
      if(selectedActivities.length===0)return alert('请先选择要报名的活动');
      renderSubmitPage({mode,priceVal,stockVal,total:selectedActivities.length});
    };
  }

  // 初始化插件入口
  window.__moduled_plugin__ = createDrawer;
})();
