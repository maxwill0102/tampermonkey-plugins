// ==UserScript==
// @name         活动报名插件 V4.8.4（详情页首组图片+优化布局）
// @namespace    https://yourdomain.com
// @version      4.8.4
// @description  在详情视图中循环展示首批商品，表格优化：商品信息列增加图片+摘要
// @match        https://agentseller.temu.com/activity/marketing-activity*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
  'use strict';

  // 样式
  GM_addStyle(`
    #moduled-drawer { position:fixed; top:0; right:0; width:780px; height:100%; background:#fff;
      border-left:1px solid #ccc; z-index:999999; overflow-y:auto; font-family:Arial; box-shadow:-2px 0 8px rgba(0,0,0,0.2);} 
    #moduled-drawer h2 { font-size:18px; padding:16px; margin:0; border-bottom:1px solid #eee; }
    #moduled-close { position:absolute; top:10px; right:10px; cursor:pointer; }
    .moduled-section { padding:16px; border-bottom:1px solid #eee; }
    table { width:100%; border-collapse:collapse; margin-top:8px; }
    th, td { padding:8px; border:1px solid #ddd; vertical-align:top; }
    th { background:#f9f9f9; font-weight:bold; text-align:left; }
    .product-cell { display:flex; align-items:flex-start; }
    .product-cell img { width:60px; height:60px; object-fit:cover; margin-right:8px; }
    .product-cell .title { flex:1; font-size:14px; line-height:1.2; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
  `);

  // React Fiber 工具
  function getReactProps(dom) {
    for (const k in dom) {
      if (k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')) {
        const f = dom[k];
        return (f.return && f.return.memoizedProps) || (f._currentElement && f._currentElement.props) || {};
      }
    }
    return {};
  }

  // 渲染详情视图
  function renderSubmitPage(config) {
    const d = document.getElementById('moduled-drawer');
    d.innerHTML = `
      <h2>报名详情 <span id="moduled-close">❌</span></h2>
      <div class="moduled-section">
        <p>价格方式：${config.mode==='profit'?'利润率不低于':'价格不低于固定值'} ${config.priceVal}</p>
        <p>活动库存：${config.stockVal||'默认'}</p>
      </div>
      <div class="moduled-section">
        <p>当前活动：${config.current} / ${config.total}</p>
        <p>报名成功：${config.success} / ${config.attempt}</p>
        <p>未报名数量：${config.attempt - config.success}</p>
      </div>
      <div class="moduled-section">
        <table>
          <thead>
            <tr>
              <th>商品信息</th>
              <th>SKC</th>
              <th>日常价格</th>
              <th>活动申报价</th>
              <th>是否满足条件</th>
              <th>活动库存</th>
              <th>是否成功</th>
            </tr>
          </thead>
          <tbody id="product-rows">
            <tr><td colspan="7" align="center">正在加载首批商品数据...</td></tr>
          </tbody>
        </table>
      </div>
      <div class="moduled-section" style="text-align:center">
        <button id="moduled-pause">暂停</button>
      </div>
    `;
    d.querySelector('#moduled-close').onclick = () => produceDrawer();
  }

  // 填充首批商品
  function fillFirstProduct(data, config) {
    const tbody = document.getElementById('product-rows');
    tbody.innerHTML = '';
    data.forEach(item => {
      const siteInfo = item.activitySiteInfoList[0] || {};
      const skcInfo = siteInfo.skcList[0] || {};
      const sku = skcInfo.skuList[0] || {};
      const picUrl = item.pictureUrl || '';
      const title = item.productName || '';
      const skcId = skcInfo.skcId || '';
      const ext = sku.extCode || '';
      const daily = sku.dailyPrice!=null ? (sku.dailyPrice/100).toFixed(2) : '';
      const sug = sku.suggestActivityPrice!=null ? (sku.suggestActivityPrice/100).toFixed(2) : '';
      const meet = (sku.suggestActivityPrice/100) >= config.priceVal ? '是':'否';
      const stock = meet==='是' ? (config.stockVal || item.suggestActivityStock) : '';
      const success = '';
      tbody.innerHTML += `
        <tr>
          <td><div class="product-cell"><img src="${picUrl}" alt=""><div class="title" title="${title}">${title}</div></div></td>
          <td>${skcId}<br>货号:${ext}</td>
          <td>¥${daily}</td>
          <td>¥${sug}</td>
          <td>${meet}</td>
          <td>${stock}</td>
          <td>${success}</td>
        </tr>`;
    });
  }

  // 拉取并渲染
  function fetchAndRenderFirst(type, thematicId, config) {
    renderSubmitPage(config);
    GM_xmlhttpRequest({
      method:'POST',
      url:'https://agentseller.temu.com/api/kiana/gamblers/marketing/enroll/semi/scroll/match',
      headers:{
        'Content-Type':'application/json',
        'mallid':'634418223153529',
        'anti-content':'0aqAfoixYySYj9E2J0didyxgjRAwIqP2ID3kKGzdvqe84kyjIs4HyQfYOmjkrrze-crCiTnixgSUJIf0UKVZgmvQ75Eo_Bl6DEfLU9TF9-475E8cqUGNjYTATLJVJJqWySNB6kUA-xv1ltrWo4j80KfDIeHrC4H_5ekuK9QxQhAxvj9Q_P7hDAT4RTMrofxM5qYQUWAPzhC0WP-cTojUGQUfhZBM448owrxCtZ01vN9jxWjo087lM5hcCnRcBL02IflDP6slH4jZfiC0WUuiDbCQaXnHP7N_2x4t8H9RY2Xbs7UzRP17UlcguQbXRT1XElhr0AuaDJRDMSn88Ai5HNunGj2yyqMNtAcvWouNUwqAud9jnG__Z_Exp1l7pVnYYSB-Ub2L5IXRayS5QKvxL9vyu6BntuXBYSR2a8nqQ5RwjMStfIcXj6a5sljEe5FpqKek4ZlKK3GVq-2gw-2b_dcP0s_PPp3DKJuLtomM_QrzMFzESn2Ues4L4ZfSSRvdfXpV90GmEsbKvnlyvbJdmKkAmwpH-GzctDI4Z8bBkSO1eFK1yZCGZTSFhgq6wTtag96vwP0rvpgOMzEVgnwqkgs7hGqPOdzrdhgqKRZu4Y61vLS31aj1ZcDOoaPHL52nPmkd4bKAA8W_LvnOSy28dLdpDOIj2afFRvTt51-fsn-_ICH1KfzO0ZR-szvBDmKjJB_QffwpggAygXKvEYnFkTP5gWr28VB64SU3lrVVNArqnrc6ZrDgYcQYVAqQz1JXvLXeXGVaRTGqi8K1eWqLiVWK0ronxlyU2gJ',
        'referer':location.href,
        'origin':location.origin,
        'cookie':document.cookie,
        'user-agent':navigator.userAgent
      },
      data:JSON.stringify({activityType:Number(type),activityThematicId:Number(thematicId),rowCount:50,addSite:true,searchScrollContext:''}),
      onload(res){
        try { const d = JSON.parse(res.responseText); if(d.success) fillFirstProduct(d.result.matchList,config); }
        catch(e){ console.error(e);} },
      onerror(err){ console.error(err);}  
    });
  }

  // 列表与短期渲染略，同 V4.8.3
  function fetchActivityData(){/*...*/}
  async function fetchShortTermActivities(){/*...*/}

  // 创建抽屉
  function createDrawer(isDetail) {
    document.getElementById('moduled-drawer')?.remove();
    const d=document.createElement('div'); d.id='moduled-drawer';
    let html=`
      <h2>活动报名 V4.8.4 <span id="moduled-close">❌</span></h2>
      <div class="moduled-section" id="moduled-settings">
        <div class="moduled-input-group">
          <label>价格设置方式</label>
          <select id="moduled-price-mode"><option value="fixed">不低于</option><option value="profit">利润率不低于</option></select>
        </div>
        <div class="moduled-input-group">
          <label id="moduled-price-label">活动价格不低于</label>
          <input type="number" id="moduled-price-input" placeholder="必填" />
        </div>
        <div class="moduled-input-group">
          <label>活动库存（选填）</label>
          <input type="number" id="moduled-stock-input" placeholder="默认" />
        </div>
      </div>`;
    if(!isDetail) {
      html+=`
      <div class="moduled-section"><strong>长期活动</strong><div id="moduled-long"></div></div>
      <div class="moduled-section"><strong>短期活动</strong><div class="moduled-tabs"><div class="moduled-tab active" data-tab="0">大促</div><div class="moduled-tab" data-tab="1">秒杀</div><div class="moduled-tab" data-tab="2">清仓</div></div><div id="moduled-short-panels"><div class="moduled-tab-panel active" id="moduled-tab-0"></div><div class="moduled-tab-panel" id="moduled-tab-1"></div><div class="moduled-tab-panel" id="moduled-tab-2"></div></div></div>`;
    }
    html+=`<div class="moduled-section" style="text-align:center"><button id="moduled-submit">立即报名</button></div>`;
    d.innerHTML=html; document.body.appendChild(d);
    d.querySelector('#moduled-close').onclick=()=>d.remove();
    d.querySelector('#moduled-price-mode').onchange=function(){ d.querySelector('#moduled-price-label').textContent=this.value==='profit'?'利润率不低于':'活动价格不低于'; };

    if(!isDetail) {
      d.querySelectorAll('.moduled-tab').forEach(t=>t.onclick=()=>{/*切Tab*/});
      fetchActivityData(); fetchShortTermActivities();
      d.querySelector('#moduled-submit').onclick=()=>{/*列表模式调用 fetchAndRenderFirst */};
    } else {
      d.querySelector('#moduled-submit').onclick=()=>{/*详情模式调用 fetchAndRenderFirst */};
    }
  }

  function produceDrawer() {
    const p=location.pathname;
    const listRegex=/^\/activity\/marketing-activity\/?$/;
    const isList=listRegex.test(p);
    const isDetail=p.includes('/detail-new');
    if(!isList&&!isDetail) { alert('请打开营销活动列表或具体活动报名页面'); return; }
    createDrawer(isDetail);
  }

  window.__moduled_plugin__ = produceDrawer;
})();
