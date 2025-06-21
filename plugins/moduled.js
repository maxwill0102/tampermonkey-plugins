// ==UserScript==
// @name         活动报名插件 V4.8.2（列表/详情抽屉 + 新页面跳转）
// @namespace    https://yourdomain.com
// @version      4.8.2
// @description  列表页显示长期/短期活动并支持立即报名跳转；详情页仅显示设置并可跳转；其他页面弹提示
// @match        https://agentseller.temu.com/activity/marketing-activity*
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

  // 抓取首批商品数据（测试）
  function fetchProductsOnce(type, thematicId) {
    GM_xmlhttpRequest({
      method: 'POST',
      url: 'https://agentseller.temu.com/api/kiana/gamblers/marketing/enroll/semi/scroll/match',
      headers: {
        'Content-Type':'application/json',
        'mallid':'634418223153529',
        'anti-content':'<替换为anti-content>',
        'referer': location.href,
        'origin': location.origin,
        'cookie': document.cookie,
        'user-agent': navigator.userAgent
      },
      data: JSON.stringify({ activityType:Number(type), activityThematicId:Number(thematicId), rowCount:50, addSite:true, searchScrollContext:'' }),
      onload(res) {
        try {
          const d = JSON.parse(res.responseText);
          console.log('✅ 首批 matchList:', d.result.matchList);
        } catch(e) { console.error('解析失败', e); }
      },
      onerror(err) { console.error('请求失败', err); }
    });
  }

  // 渲染长期活动
  function fetchActivityData() {
    const longCon = document.getElementById('moduled-long');
    if (!longCon) return;
    longCon.innerHTML = '<div class="moduled-table-header"><div>类型</div><div>说明</div><div>选择</div></div>';
    document.querySelectorAll('.act-item_actItem__x2Uci').forEach(el => {
      const name = el.querySelector('.act-item_activityName__Ryh3Y')?.innerText.trim()||'';
      const desc = el.querySelector('.act-item_activityContent__ju2KR')?.innerText.trim()||'';
      // 拿原生按钮的 fiber props
      const goBtn = el.querySelector('a[data-testid="beast-core-button-link"]');
      let type='', them='';
      try { const props = getReactProps(goBtn); type=props.activityType; them=props.activityThematicId; } catch{};
      longCon.innerHTML += `
        <div class="moduled-table-row">
          <div>${name}</div><div>${desc}</div>
          <div><input type="radio" name="activity" data-type="${type}" data-thematicid="${them}" /></div>
        </div>`;
    });
  }

  // 渲染短期活动
  async function fetchShortTermActivities() {
    const panels=[0,1,2].map(i=>document.getElementById('moduled-tab-'+i));
    const roots=document.querySelectorAll('.TAB_tabContentInnerContainer_5-118-0'); if(roots.length<2) return;
    const tabs=roots[1].querySelectorAll('[data-testid="beast-core-tab-itemLabel-wrapper"]');
    for(let i=0;i<tabs.length;i++){
      tabs[i].click(); await new Promise(r=>setTimeout(r,400));
      const panel=panels[i]; panel.innerHTML='<div class="moduled-table-header"><div>主题</div><div>报名时间</div><div>活动时间</div><div>已报名</div><div>选择</div></div>';
      document.querySelectorAll('[data-testid="beast-core-table-body-tr"]').forEach(row=>{
        const txt=row.querySelector('[data-testid="beast-core-table-td"]')?.innerText.trim()||'';
        const goBtn=row.querySelector('a[data-testid="beast-core-button-link"]');
        let type='', them=''; try{ const p=getReactProps(goBtn); type=p.activityType; them=p.activityThematicId; }catch{}
        panel.innerHTML+=`
          <div class="moduled-table-row">
            <div>${txt}</div><div>–</div><div>–</div><div>–</div>
            <div><input type="radio" name="activity" data-type="${type}" data-thematicid="${them}" /></div>
          </div>`;
      });
    }
  }

  // React Fiber props util
  function getReactProps(dom) {
    for(const k in dom) if(k.startsWith('__reactFiber$')||k.startsWith('__reactInternalInstance$')){
      const f=dom[k]; return (f.return&&f.return.memoizedProps)||(f._currentElement&&f._currentElement.props);
    }
    return {};
  }

  // 抽屉构建
  function createDrawer(isDetailPage) {
    document.getElementById('moduled-drawer')?.remove();
    const d=document.createElement('div'); d.id='moduled-drawer';
    let html=`
      <h2>活动报名 V4.8.2 <span id="moduled-close">❌</span></h2>
      <div class="moduled-section" id="moduled-settings">
        <div class="moduled-input-group">
          <label>价格设置方式</label>
          <select id="moduled-price-mode"><option value="fixed">不低于固定值</option><option value="profit">利润率不低于</option></select>
        </div>
        <div class="moduled-input-group">
          <label id="moduled-price-label">活动价格不低于</label>
          <input type="number" id="moduled-price-input" placeholder="必填" />
        </div>
        <div class="moduled-input-group">
          <label>库存（选填）</label><input type="number" id="moduled-stock-input" placeholder="默认" />
        </div>
      </div>`;
    if(!isDetailPage) {
      html+=`
      <div class="moduled-section"><strong>长期活动</strong><div id="moduled-long"></div></div>
      <div class="moduled-section"><strong>短期活动</strong><div class="moduled-tabs"><div class="moduled-tab active" data-tab="0">大促</div><div class="moduled-tab" data-tab="1">秒杀</div><div class="moduled-tab" data-tab="2">清仓</div></div><div id="moduled-short-panels"><div class="moduled-tab-panel active" id="moduled-tab-0"></div><div class="moduled-tab-panel" id="moduled-tab-1"></div><div class="moduled-tab-panel" id="moduled-tab-2"></div></div></div>`;
    }
    html+=`<div class="moduled-section" style="text-align:center"><button id="moduled-submit">立即报名</button></div>`;
    d.innerHTML=html; document.body.appendChild(d);
    d.querySelector('#moduled-close').onclick=()=>d.remove();
    d.querySelector('#moduled-price-mode').onchange=function(){ d.querySelector('#moduled-price-label').textContent=this.value==='profit'?'利润率不低于':'活动价格不低于'; };
    if(!isDetailPage) {
      // 切Tab
      d.querySelectorAll('.moduled-tab').forEach(t=>t.onclick=()=>{ d.querySelectorAll('.moduled-tab, .moduled-tab-panel').forEach(e=>e.classList.remove('active')); t.classList.add('active'); d.querySelector('#moduled-tab-'+t.dataset.tab).classList.add('active'); });
      fetchActivityData(); fetchShortTermActivities();
      d.querySelector('#moduled-submit').onclick=()=>{
        const sel=d.querySelector('input[name="activity"]:checked'); if(!sel) return alert('请选择活动');
        const url=`https://agentseller.temu.com/activity/marketing-activity/detail-new?type=${sel.dataset.type}&thematicId=${sel.dataset.thematicid}`;
        window.open(url,'_blank');
      };
    } else {
      d.querySelector('#moduled-submit').onclick=()=>{
        const nativeBtn=document.querySelector('button[data-testid="beast-core-button"]');
        if(nativeBtn) nativeBtn.click();
        else alert('未找到立即报名按钮');
      };
    }
  }

  // 插件入口
  window.__moduled_plugin__ = ()=>{
    const path=location.pathname;
    const isList=/^\/activity\/marketing-activity\/?$/.test(path);
    const isDetail=path.includes('/detail-new');
    if(!isList && !isDetail) return alert('请打开营销活动列表或具体活动报名页面');
    createDrawer(isDetail);
  };
})();
