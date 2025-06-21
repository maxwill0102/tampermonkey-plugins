// ==UserScript==
// @name         活动报名插件 V4.9.0（批量拉取+一次性提交）
// @namespace    https://yourdomain.com
// @version      4.9.0
// @description  支持递归拉取全部商品（每次50条）并一次性批量提交报名，带调试日志。
// @match        https://agentseller.temu.com/activity/marketing-activity*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
  'use strict';

  const MALLID       = '634418223153529';
  const ANTI_CONTENT = '0aqAfoixYySYj9E2J0didyxgjRAwIqP2ID3kKGzdvqe84kyjIs4HyQfYOmjkrrze-crCiTnixgSUJIf0UKVZgmvQ75Eo_Bl6DEfLU9TF9-475E8cqUGNjYTATLJVJJqWySNB6kUA-xv1ltrWo4j80KfDIeHrC4H_5ekuK9QxQhAxvj9Q_P7hDAT4RTMrofxM5qYQUWAPzhC0WP-cTojUGQUfhZBM448owrxCtZ01vN9jxWjo087lM5hcCnRcBL02IflDP6slH4jZfiC0WUuiDbCQaXnHP7N_2x4t8H9RY2Xbs7UzRP17UlcguQbXRT1XElhr0AuaDJRDMSn88Ai5HNunGj2yyqMNtAcvWouNUwqAud9jnG__Z_Exp1l7pVnYYSB-Ub2L5IXRayS5QKvxL9vyu6BntuXBYSR2a8nqQ5RwjMStfIcXj6a5sljEe5FpqKek4ZlKK3GVq-2gw-2b_dcP0s_PPp3DKJuLtomM_QrzMFzESn2Ues4L4ZfSSRvdfXpV90GmEsbKvnlyvbJdmKkAmwpH-GzctDI4Z8bBkSO1eFK1yZCGZTSFhgq6wTtag96vwP0rvpgOMzEVgnwqkgs7hGqPOdzrdhgqKRZu4Y61vLS31aj1ZcDOoaPHL52nPmkd4bKAA8W_LvnOSy28dLdpDOIj2afFRvTt51-fsn-_ICH1KfzO0ZR-szvBDmKjJB_QffwpggAygXKvEYnFkTP5gWr28VB64SU3lrVVNArqnrc6ZrDgYcQYVAqQz1JXvLXeXGVaRTGqi8K1eWqLiVWK0ronxlyU2gJ';

  // —— 样式（保留 V4.8.6 全部样式） —— 
  GM_addStyle(`
    #moduled-drawer {
      position: fixed; top: 0; right: 0;
      width: 780px; height: 100%; background: #fff;
      border-left: 1px solid #ccc; z-index: 999999;
      overflow-y: auto; font-family: Arial, sans-serif;
      box-shadow: -2px 0 8px rgba(0,0,0,0.2);
    }
    #moduled-drawer h2 {
      font-size: 18px; padding: 16px; margin: 0;
      border-bottom: 1px solid #eee; background: #fafafa;
    }
    #moduled-close {
      position: absolute; top: 12px; right: 12px;
      cursor: pointer; font-size: 16px;
    }
    .moduled-section { padding: 16px; border-bottom: 1px solid #eee; }
    .moduled-input-group { margin-bottom: 12px; }
    .moduled-input-group label {
      display: block; font-size: 14px; margin-bottom: 4px;
    }
    .moduled-input-group input,
    .moduled-input-group select {
      width: 100%; padding: 8px; font-size: 14px;
      border: 1px solid #ccc; border-radius: 4px;
    }
    #moduled-submit { padding: 8px 16px; font-size: 14px;
      background: #007bff; color: #fff; border:none; border-radius:4px; cursor:pointer;
    }
    #auto-submit-btn {
      position: fixed; top: 100px; right: 30px; z-index:1000000;
      padding: 8px 16px; font-size:14px;
      background:#28a745; color:#fff; border:none; border-radius:4px; cursor:pointer;
    }
    table {
      width:100%; border-collapse:collapse; margin-top:8px; table-layout:fixed;
    }
    th, td {
      padding:8px; border:1px solid #ddd; vertical-align:top; word-wrap:break-word;
    }
    th { background:#f5f5f5; font-weight:500; text-align:left; }
    .product-cell { display:flex; align-items:flex-start; }
    .product-cell img {
      width:60px; height:60px; object-fit:cover;
      margin-right:8px; border:1px solid #eee; border-radius:4px;
    }
    .product-cell .title {
      flex:1; font-size:14px; line-height:1.4;
      overflow:hidden; white-space:nowrap; text-overflow:ellipsis;
    }
    .moduled-tab { flex:1; text-align:center; padding:8px; cursor:pointer; font-weight:bold; }
    .moduled-tab.active { color:red; border-bottom:2px solid red; }
    .moduled-tab-panel { display:none; max-height:300px; overflow-y:auto; }
    .moduled-tab-panel.active { display:block; }
  `);

  // —— 获取 React Fiber Props （拿 type/thematicId） —— 
  function getReactProps(dom) {
    for (const k in dom) {
      if (k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')) {
        const f = dom[k];
        return (f.return && f.return.memoizedProps)
            || (f._currentElement && f._currentElement.props)
            || {};
      }
    }
    return {};
  }

  // —— 渲染“报名详情”界面（表格+按钮） —— 
  function renderSubmitPage(cfg) {
    const d = document.getElementById('moduled-drawer');
    d.innerHTML = `
      <h2>报名详情 <span id="moduled-close">❌</span></h2>
      <div class="moduled-section">
        <p><strong>价格方式：</strong>${cfg.mode==='profit'?'利润率不低于':'价格不低于'} ${cfg.priceVal}</p>
        <p><strong>活动库存：</strong>${cfg.stockVal||'默认'}</p>
      </div>
      <div class="moduled-section">
        <table>
          <thead>
            <tr>
              <th style="width:30%">商品信息</th>
              <th style="width:15%">SKC</th>
              <th style="width:10%">日常价格</th>
              <th style="width:10%">活动申报价</th>
              <th style="width:10%">是否满足</th>
              <th style="width:10%">活动库存</th>
            </tr>
          </thead>
          <tbody id="product-rows">
            <tr><td colspan="6" align="center">正在加载商品…</td></tr>
          </tbody>
        </table>
      </div>
      <div class="moduled-section" style="text-align:center">
        <button id="auto-submit-btn">🧠 批量提交报名</button>
      </div>
    `;
    d.querySelector('#moduled-close').onclick = () => d.remove();
    d.querySelector('#auto-submit-btn').onclick = submitEnrollment;
  }

  // —— 填充表格 —— 
  function fillProducts(items, cfg) {
    console.log('🔔 当前已有商品总数：', items.length);
    const tb = document.getElementById('product-rows');
    tb.innerHTML = '';
    items.forEach(item => {
      const site = item.activitySiteInfoList[0]||{};
      const skc  = site.skcList[0]||{};
      const sku  = skc.skuList[0]||{};
      const pic  = item.pictureUrl||'';
      const full = item.productName||'';
      const words= full.split(/\s+/).slice(0,5);
      const title= words.join(' ') + (full.split(/\s+/).length>5?'...':'');
      const daily= sku.dailyPrice!=null ? (sku.dailyPrice/100).toFixed(2) : '';
      const sug  = sku.suggestActivityPrice!=null ? (sku.suggestActivityPrice/100).toFixed(2) : '';
      const meet = (sku.suggestActivityPrice/100)>=cfg.priceVal ? '是':'否';
      const stock= meet==='是' ? (cfg.stockVal||item.suggestActivityStock) : '';
      tb.innerHTML += `
        <tr>
          <td>
            <div class="product-cell">
              <img src="${pic}" /><div class="title" title="${full}">${title}</div>
            </div>
          </td>
          <td>${skc.skcId||''}<br>货号:${sku.extCode||''}</td>
          <td>¥${daily}</td>
          <td>¥${sug}</td>
          <td>${meet}</td>
          <td>${stock}</td>
        </tr>`;
    });
  }

  // —— 递归拉取所有商品 —— 
  function fetchAllProducts(type, them, cfg, scrollCtx = '') {
    // 第一次调用前请清空 window.__moduled_items__ = [];
    console.log('▶️ 拉取 /match，scrollCtx=', scrollCtx);
    GM_xmlhttpRequest({
      method: 'POST',
      url: 'https://agentseller.temu.com/api/kiana/gamblers/marketing/enroll/semi/scroll/match',
      headers: {
        'Content-Type':'application/json',
        'mallid':MALLID,
        'anti-content':ANTI_CONTENT,
        'referer':location.href,
        'origin':location.origin,
        'cookie':document.cookie,
        'user-agent':navigator.userAgent
      },
      data: JSON.stringify({
        activityType: Number(type),
        activityThematicId: Number(them),
        rowCount: 50,
        addSite: true,
        searchScrollContext: scrollCtx
      }),
      onload(res) {
        let d;
        try { d = JSON.parse(res.responseText); }
        catch(e){ return console.error('❌ 解析 /match 失败', e); }
        console.log('🔔 /match 返回：', d);
        if(!d.success) {
          return alert('拉取失败：' + d.errorMsg);
        }
        const list = d.result.matchList||[];
        window.__moduled_items__ = (window.__moduled_items__||[]).concat(list);
        fillProducts(window.__moduled_items__, cfg);

        if(d.result.hasMore && d.result.searchScrollContext){
          // 继续拉下一批
          fetchAllProducts(type, them, cfg, d.result.searchScrollContext);
        } else {
          console.log('✅ 全部拉取完毕，共', window.__moduled_items__.length, '条');
        }
      },
      onerror(err){
        console.error('❌ /match 网络异常：', err);
        alert('拉取网络错误');
      }
    });
  }

  // —— 构造批量报名 payload —— 
  function buildPayload(type, them, rawList, cfg) {
    const products = [];
    rawList.forEach(item => {
      const sku = item.activitySiteInfoList[0]?.skcList[0]?.skuList[0]||{};
      const priceCents = sku.suggestActivityPrice || 0;
      const meet = (priceCents/100)>=cfg.priceVal;
      if(!meet) return;
      products.push({
        productId: item.productId,
        activityStock: cfg.stockVal || item.suggestActivityStock,
        sessionIds: item.suggestEnrollSessionIdList.length
                    ? item.suggestEnrollSessionIdList
                    : item.enrollSessionIdList||[],
        siteInfoList: [{
          siteId: item.activitySiteInfoList[0]?.siteId||100,
          skcList: [{
            skcId: item.activitySiteInfoList[0]?.skcList[0]?.skcId,
            skuList: [{
              skuId: sku.skuId,
              activityPrice: priceCents
            }]
          }]
        }]
      });
    });
    console.log('🆗 满足条件的 products 数量：', products.length, products);
    return {
      activityType: Number(type),
      activityThematicId: Number(them),
      productList: products
    };
  }

  // —— 批量提交报名 —— 
  function submitEnrollment() {
    const params = new URLSearchParams(location.search);
    const type  = params.get('type') || params.get('activityType') || '13';
    const them  = params.get('thematicId')||params.get('thematicid');
    if(!them) return alert('无法识别活动 ID');

    const cfg  = window.__moduled_config__||{};
    const raws = window.__moduled_items__||[];
    if(raws.length===0) return alert('请先点击“立即报名”拉取商品');

    const payload = buildPayload(type, them, raws, cfg);
    if(!payload.productList.length){
      return alert('没有满足条件的商品可提交');
    }

    console.log('📤 最终报名 Payload：', payload);
    GM_xmlhttpRequest({
      method: 'POST',
      url: 'https://agentseller.temu.com/api/kiana/gamblers/marketing/enroll/semi/submit',
      headers: {
        'Content-Type':'application/json',
        'mallid':MALLID
      },
      data: JSON.stringify(payload),
      onload(res){
        let d;
        try { d = JSON.parse(res.responseText); }
        catch(e){ return console.error('❌ 解析 /submit 失败', e); }
        console.log('🔔 /semi/submit 返回：', d);
        if(d.success){
          alert('✅ 报名成功，共 ' + d.result.successCount + ' 条');
        } else {
          alert('❌ 报名失败：' + d.errorMsg);
        }
      },
      onerror(err){
        console.error('❌ /submit 网络异常：', err);
        alert('报名网络错误');
      }
    });
  }

  // —— 列表/详情页 抽屉入口逻辑 —— 
  function fetchActivityData() {
    const longCon = document.getElementById('moduled-long');
    if(!longCon) return;
    longCon.innerHTML = '<div class="moduled-table-header"><div>类型</div><div>说明</div><div>选择</div></div>';
    document.querySelectorAll('.act-item_actItem__x2Uci').forEach(el=>{
      const name = el.querySelector('.act-item_activityName__Ryh3Y')?.innerText.trim()||'';
      const desc = el.querySelector('.act-item_activityContent__ju2KR')?.innerText.trim()||'';
      let type='', them='';
      try{
        const btn = el.querySelector('a[data-testid="beast-core-button-link"]');
        ({activityType:type, activityThematicId:them} = getReactProps(btn));
      }catch{}
      longCon.innerHTML += `
        <div class="moduled-table-row">
          <div>${name}</div>
          <div>${desc}</div>
          <div><input type="radio" name="activity" data-type="${type}" data-thematicid="${them}" /></div>
        </div>`;
    });
  }
  async function fetchShortTermActivities(){
    const panels = [0,1,2].map(i => document.getElementById('moduled-tab-'+i));
    const roots  = document.querySelectorAll('.TAB_tabContentInnerContainer_5-118-0');
    if(roots.length<2) return;
    const tabs = roots[1].querySelectorAll('[data-testid="beast-core-tab-itemLabel-wrapper"]');
    for(let i=0; i<tabs.length; i++){
      tabs[i].click(); await new Promise(r=>setTimeout(r,400));
      panels[i].innerHTML = '<div class="moduled-table-header"><div>主题</div><div>报名时间</div><div>活动时间</div><div>已报名</div><div>选择</div></div>';
      document.querySelectorAll('[data-testid="beast-core-table-body-tr"]').forEach(row=>{
        const txt = row.querySelector('[data-testid="beast-core-table-td"]')?.innerText.trim()||'';
        let type='', them='';
        try{
          const btn = row.querySelector('a[data-testid="beast-core-button-link"]');
          ({activityType:type, activityThematicId:them} = getReactProps(btn));
        }catch{}
        panels[i].innerHTML += `
          <div class="moduled-table-row">
            <div>${txt}</div><div>–</div><div>–</div><div>–</div>
            <div><input type="radio" name="activity" data-type="${type}" data-thematicid="${them}" /></div>
          </div>`;
      });
    }
  }

  function createDrawer(isDetail){
    document.getElementById('moduled-drawer')?.remove();
    const d = document.createElement('div'); d.id='moduled-drawer';
    let html = `
      <h2>活动报名 V4.9.0 <span id="moduled-close">❌</span></h2>
      <div class="moduled-section" id="moduled-settings">
        <div class="moduled-input-group">
          <label>价格设置方式</label>
          <select id="moduled-price-mode">
            <option value="fixed">不低于</option>
            <option value="profit">利润率不低于</option>
          </select>
        </div>
        <div class="moduled-input-group">
          <label id="moduled-price-label">活动价格不低于</label>
          <input type="number" id="moduled-price-input" placeholder="必填"/>
        </div>
        <div class="moduled-input-group">
          <label>活动库存（选填）</label>
          <input type="number" id="moduled-stock-input" placeholder="默认"/>
        </div>
      </div>`;
    if(!isDetail){
      html += `
        <div class="moduled-section"><strong>长期活动</strong><div id="moduled-long"></div></div>
        <div class="moduled-section"><strong>短期活动</strong>
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
        </div>`;
    }
    html += `<div class="moduled-section" style="text-align:center"><button id="moduled-submit">立即报名</button></div>`;

    d.innerHTML = html;
    document.body.appendChild(d);
    d.querySelector('#moduled-close').onclick = () => d.remove();
    d.querySelector('#moduled-price-mode').onchange = function(){
      d.querySelector('#moduled-price-label').textContent = this.value==='profit' ? '利润率不低于' : '活动价格不低于';
    };

    d.querySelector('#moduled-submit').onclick = () => {
      const mode     = d.querySelector('#moduled-price-mode').value;
      const priceVal = Number(d.querySelector('#moduled-price-input').value.trim());
      if(!priceVal) return alert('请填写活动价格');
      const stockVal = d.querySelector('#moduled-stock-input').value.trim();
      const sel = isDetail
        ? null
        : d.querySelector('input[name="activity"]:checked');

      let type, them;
      if(sel){
        type = sel.dataset.type;
        them = sel.dataset.thematicid;
      } else {
        const p = new URLSearchParams(location.search);
        type = p.get('type') || '13';
        them = p.get('thematicId') || p.get('thematicid');
      }
      if(!them) return alert('请选择活动或打开详情页');

      // 存配置
      window.__moduled_config__ = { mode, priceVal, stockVal };
      // 清数据
      window.__moduled_items__ = [];
      // 渲染页面空表
      renderSubmitPage(window.__moduled_config__);
      // 开始递归拉取
      fetchAllProducts(type, them, window.__moduled_config__);
    };

    if(!isDetail){
      fetchActivityData();
      fetchShortTermActivities();
    }
  }

  function produceDrawer(){
    const p = location.pathname;
    const isList   = /^\/activity\/marketing-activity\/?$/.test(p);
    const isDetail = p.includes('/detail-new');
    if(!isList && !isDetail){
      return alert('请打开营销活动列表或具体活动报名页面');
    }
    createDrawer(isDetail);
  }

  // 暴露给控制台或快捷键调用
  window.__moduled_plugin__ = produceDrawer;

  // —— 页面加载后你可以在控制台执行 __moduled_plugin__() 来打开抽屉 —— 
  // —— 或者自己绑定一个快捷按钮触发 __moduled_plugin__() —— 

  console.log('插件 moduled 加载成功，调用 __moduled_plugin__() 打开报名抽屉');
})();
