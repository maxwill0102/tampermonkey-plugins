// ==UserScript==
// @name         活动报名插件 V4.7（Fiber 直取 + 抽屉 UI + 首批测试）
// @namespace    https://yourdomain.com
// @version      4.7.0
// @description  支持价格校验、长期/短期活动展示 + React Fiber 拿参数 + 首批商品抓取测试
// @match        https://*.kuajingmaihuo.com/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
  'use strict';

  // 样式
  GM_addStyle(`
    #moduled-drawer { position:fixed; top:0; right:0; width:780px; height:100%; background:#fff; border-left:1px solid #ccc; z-index:999999; overflow-y:auto; font-family:Arial; box-shadow:-2px 0 8px rgba(0,0,0,0.2); }
    #moduled-drawer h2 { font-size:18px; padding:16px; margin:0; border-bottom:1px solid #eee; }
    #moduled-close { position:absolute; top:10px; right:10px; cursor:pointer; }
    .moduled-section { padding:16px; border-bottom:1px solid #eee; }
    .moduled-input-group { margin-bottom:10px; }
    .moduled-input-group label { display:block; font-size:14px; margin-bottom:4px; }
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

  // Fiber props util
  function getReactProps(dom) {
    for (const key in dom) {
      if (key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$')) {
        const fiber = dom[key];
        if (fiber.return && fiber.return.memoizedProps) return fiber.return.memoizedProps;
        if (fiber._currentElement && fiber._currentElement.props) return fiber._currentElement.props;
      }
    }
    return null;
  }

  // 首批抓取
  function fetchFirstBatch(type, thematicId) {
    console.log(`📣 抓首批：type=${type}, thematicId=${thematicId}`);
    GM_xmlhttpRequest({
      method:'POST',
      url:'https://agentseller.temu.com/api/kiana/gamblers/marketing/enroll/semi/scroll/match',
      headers:{
        'Content-Type':'application/json',
        'mallid':'634418223153529',
        'anti-content':'<请替换 anti-content>',
        'referer':location.href,
        'origin':location.origin,
        'cookie':document.cookie,
        'user-agent':navigator.userAgent
      },
      data:JSON.stringify({
        activityType:+type,
        activityThematicId:+thematicId,
        rowCount:50,
        addSite:true,
        searchScrollContext:''
      }),
      onload(res){
        try {
          const d = JSON.parse(res.responseText);
          console.log('✅ 首批 matchList:', d.result.matchList);
        } catch(e){ console.error('解析失败', e); }
      },
      onerror(err){ console.error('请求失败', err); }
    });
  }

  // 监听“去报名”按钮，直接取 Fiber props 并抓首批
  document.addEventListener('click', e => {
    const goBtn = e.target.closest('a[data-testid="beast-core-button-link"]');
    if (!goBtn) return;
    const props = getReactProps(goBtn);
    if (props && props.activityType && props.activityThematicId) {
      fetchFirstBatch(props.activityType, props.activityThematicId);
    } else {
      console.warn('未从 Fiber props 中获取到参数', props);
    }
  }, true);

  // 活动列表渲染
  function fetchActivityData() {
    const longCon = document.getElementById('moduled-long');
    if (!longCon) return;
    longCon.innerHTML = '<div class="moduled-table-header"><div>类型</div><div>说明</div><div>选择</div></div>';
    document.querySelectorAll('.act-item_actItem__x2Uci').forEach(el => {
      const name = el.querySelector('.act-item_activityName__Ryh3Y')?.innerText.trim()||'';
      const desc = el.querySelector('.act-item_activityContent__ju2KR')?.innerText.trim()||'';
      longCon.innerHTML += `<div class="moduled-table-row"><div>${name}</div><div>${desc}</div><div><input type="radio" name="activity"></div></div>`;
    });
  }

  async function fetchShortTermActivities() {
    const panels = [0,1,2].map(i => document.getElementById('moduled-tab-'+i));
    const roots = document.querySelectorAll('.TAB_tabContentInnerContainer_5-118-0');
    if (roots.length<2) return;
    const tabs = roots[1].querySelectorAll('[data-testid="beast-core-tab-itemLabel-wrapper"]');
    for (let i=0;i<tabs.length;i++){
      tabs[i].click(); await new Promise(r=>setTimeout(r,400));
      const panel = panels[i];
      panel.innerHTML = '<div class="moduled-table-header"><div>主题</div><div>报名时间</div><div>活动时间</div><div>已报名</div><div>选择</div></div>';
      document.querySelectorAll('[data-testid="beast-core-table-body-tr"]').forEach(row=>{
        const title = row.querySelector('[data-testid="beast-core-table-td"]')?.innerText.trim()||'';
        panel.innerHTML += `<div class="moduled-table-row"><div>${title}</div><div>—</div><div>—</div><div>—</div><div><input type="radio" name="activity"></div></div>`;
      });
    }
  }

  // 抽屉
  function createDrawer(){
    document.getElementById('moduled-drawer')?.remove();
    const d=document.createElement('div'); d.id='moduled-drawer';
    d.innerHTML=`
      <h2>活动报名 V4.7 <span id="moduled-close">❌</span></h2>
      <div class="moduled-section" id="moduled-settings">
        <div class="moduled-input-group">
          <label>活动价格设置方式</label>
          <select id="moduled-price-mode"><option value="fixed">价格不低于</option><option value="profit">利润率不低于</option></select>
        </div>
        <div class="moduled-input-group">
          <label id="moduled-price-label">活动价格不低于</label>
          <input type="number" id="moduled-price-input" placeholder="必填" />
        </div>
        <div class="moduled-input-group">
          <label>活动库存（选填）</label>
          <input type="number" id="moduled-stock-input" placeholder="默认" />
        </div>
      </div>
      <div class="moduled-section"><strong>长期活动</strong><div id="moduled-long"></div></div>
      <div class="moduled-section"><strong>短期活动</strong><div class="moduled-tabs"><div class="moduled-tab active" data-tab="0">大促</div><div class="moduled-tab" data-tab="1">秒杀</div><div class="moduled-tab" data-tab="2">清仓</div></div><div id="moduled-short-panels"><div class="moduled-tab-panel active" id="moduled-tab-0"></div><div class="moduled-tab-panel" id="moduled-tab-1"></div><div class="moduled-tab-panel" id="moduled-tab-2"></div></div></div>
      <div class="moduled-section" style="text-align:center"><button id="moduled-submit" style="padding:8px 16px;">立即报名</button></div>
    `;
    document.body.appendChild(d);
    d.querySelector('#moduled-close').onclick=()=>d.remove();
    d.querySelector('#moduled-price-mode').onchange=function(){ d.querySelector('#moduled-price-label').textContent=this.value==='profit'?'利润率不低于':'活动价格不低于'; };
    d.querySelectorAll('.moduled-tab').forEach(t=>t.onclick=()=>{d.querySelectorAll('.moduled-tab, .moduled-tab-panel').forEach(e=>e.classList.remove('active')); t.classList.add('active'); d.querySelector('#moduled-tab-'+t.dataset.tab).classList.add('active');});
    fetchActivityData(); fetchShortTermActivities();
    d.querySelector('#moduled-submit').onclick = ()=>{
      const pv=d.querySelector('#moduled-price-input').value.trim(); if(!pv)return alert('请填写活动价格');
      // Fiber intercept already triggered on native "去报名" click, or manual pick-- here no params needed
      alert('请在原生列表页面点击「去报名」测试');
    };
  }

  window.__moduled_plugin__ = createDrawer;
})();
