// ==UserScript==
// @name         活动报名插件 V4.8（列表页/详情页抽屉差异化）
// @namespace    https://yourdomain.com
// @version      4.8.1
// @description  列表页显示长期/短期活动，详情页只显示设置，其他页面弹提示
// @match        https://agentseller.temu.com/activity/marketing-activity*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// ==/UserScript==
(function() {
  'use strict';

  // 样式
  GM_addStyle(`
    #moduled-drawer { position:fixed; top:0; right:0; width:780px; height:100%; background:#fff; border-left:1px solid #ccc; z-index:999999; overflow-y:auto; font-family:Arial; box-shadow:-2px 0 8px rgba(0,0,0,0.2); }
    #moduled-close { position:absolute; top:10px; right:10px; cursor:pointer; }
    .moduled-section { padding:16px; border-bottom:1px solid #eee; }
    .moduled-input-group { margin-bottom:10px; }
    .moduled-input-group label { display:block; margin-bottom:4px; font-size:14px; }
    .moduled-input-group input, .moduled-input-group select { width:100%; padding:6px; font-size:14px; }
    .moduled-tabs { display:flex; margin-bottom:10px; border-bottom:1px solid #ccc; }
    .moduled-tab { flex:1; text-align:center; padding:8px; cursor:pointer; font-weight:bold; }
    .moduled-tab.active { color:red; border-bottom:2px solid red; }
    .moduled-tab-panel { display:none; max-height:300px; overflow-y:auto; }
    .moduled-tab-panel.active { display:block; }
    .moduled-table-header, .moduled-table-row { display:grid; grid-template-columns:1.5fr 2fr 2fr 1fr 1fr; gap:10px; padding:6px 0; align-items:center; }
    .moduled-table-header { font-weight:bold; border-bottom:1px solid #ccc; margin-bottom:4px; }
    .moduled-table-row { border-bottom:1px dashed #ddd; }
  `);

  // 抽屉渲染函数
  function createDrawer(isDetailPage) {
    if (document.getElementById('moduled-drawer')) return;
    const drawer = document.createElement('div');
    drawer.id = 'moduled-drawer';
    drawer.innerHTML = `
      <h2>活动报名 V4.8 <span id="moduled-close">❌</span></h2>
      <div class="moduled-section" id="moduled-settings">
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
        <div class="moduled-input-group">
          <label>活动库存数量（选填）</label>
          <input type="number" id="moduled-stock-input" placeholder="默认" />
        </div>
      </div>
      ${!isDetailPage ? `
      <div class="moduled-section">
        <strong>长期活动</strong>
        <div id="moduled-long"></div>
      </div>
      <div class="moduled-section">
        <strong>短期活动</strong>
        <div class="moduled-tabs">
          <div class="moduled-tab active" data-tab="0">大促</div>
          <div class="moduled-tab" data-tab="1">秒杀</div>
          <div class="moduled-tab" data-tab="2">清仓</div>
        </div>
        <div id="moduled-short-panels">
          <div class="moduled-tab-panel active" id="moduled-tab-0"></div>
          <div class="moduled-tab-panel" id="moduled-tab-1"></div>
          <div class="moduled-tab-panel" id="moduled-tab-2"></div>
        </div>
      </div>
      <div class="moduled-section" style="text-align:center">
        <button id="moduled-submit" style="padding:8px 16px;">立即报名</button>
      </div>
      ` : ''}
    `;
    document.body.appendChild(drawer);
    drawer.querySelector('#moduled-close').onclick = () => drawer.remove();
    drawer.querySelector('#moduled-price-mode').onchange = function() {
      drawer.querySelector('#moduled-price-label').textContent = this.value==='profit'? '活动利润率不低于':'活动价格不低于';
    };
    if (!isDetailPage) {
      // 长期/短期逻辑
      document.querySelectorAll('.moduled-tab').forEach(tab=>{
        tab.onclick=()=>{
          drawer.querySelectorAll('.moduled-tab, .moduled-tab-panel').forEach(e=>e.classList.remove('active'));
          tab.classList.add('active');
          drawer.querySelector('#moduled-tab-'+tab.dataset.tab).classList.add('active');
        };
      });
      fetchActivityData();
      fetchShortTermActivities();
      drawer.querySelector('#moduled-submit').onclick = ()=>{
        const price = drawer.querySelector('#moduled-price-input').value.trim();
        if (!price) return alert('请填写活动价格');
        // 后续报名逻辑
      };
    }
  }

  // 数据渲染函数（与之前一致）
  function fetchActivityData() {
    const longCon = document.getElementById('moduled-long');
    longCon.innerHTML = '<div class="moduled-table-header"><div>类型</div><div>说明</div><div>选择</div></div>';
    document.querySelectorAll('.act-item_actItem__x2Uci').forEach((el,i)=>{
      const name = el.querySelector('.act-item_activityName__Ryh3Y')?.innerText.trim()||'';
      const desc = el.querySelector('.act-item_activityContent__ju2KR')?.innerText.trim()||'';
      longCon.innerHTML += `<div class="moduled-table-row"><div>${name}</div><div>${desc}</div><div><input type=\"checkbox\"></div></div>`;
    });
  }
  async function fetchShortTermActivities() {
    const panels=[0,1,2].map(i=>document.getElementById('moduled-tab-'+i));
    const roots=document.querySelectorAll('.TAB_tabContentInnerContainer_5-118-0');
    if(roots.length<2) return;
    const tabs=roots[1].querySelectorAll('[data-testid="beast-core-tab-itemLabel-wrapper"]');
    for(let i=0;i<tabs.length;i++){
      tabs[i].click(); await new Promise(r=>setTimeout(r,400));
      const panel=panels[i]; panel.innerHTML='<div class="moduled-table-header"><div>主题</div><div>报名时间</div><div>活动时间</div><div>已报名</div><div>选择</div></div>';
      document.querySelectorAll('[data-testid="beast-core-table-body-tr"]').forEach(row=>{
        const txt=row.querySelector('[data-testid="beast-core-table-td"]')?.innerText.trim()||'';
        panel.innerHTML+=`<div class="moduled-table-row"><div>${txt}</div><div>–</div><div>–</div><div>–</div><div><input type=\"checkbox\"></div></div>`;
      });
    }
  }

  // 插件入口
  window.__moduled_plugin__ = ()=>{
    const path = location.pathname;
    const isList = path=== '/activity/marketing-activity' || path==='/activity/marketing-activity/';
    const isDetail = path.includes('/activity/marketing-activity/detail-new');
    if (!isList && !isDetail) {
      alert('请打开营销活动页面或者具体活动报名页面');
      return;
    }
    createDrawer(isDetail);
  };
})();
