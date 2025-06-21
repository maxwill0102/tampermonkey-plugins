// ==UserScript==
// @name         活动报名插件 V4.9.1（测试模式：打印+首条提交，保留其他接口 anti-content）
// @namespace    https://yourdomain.com
// @version      4.9.1
// @description  美化界面、标题截断、自动提交报名并刷新校验，兼容列表页/详情页抽屉逻辑，提交前打印所有满足条件商品并仅测试首条提交。
// @match        https://agentseller.temu.com/activity/marketing-activity*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
  'use strict';

  const MALLID       = '634418223153529';
  const ANTI_CONTENT = '0aqAfoixYySYj9E2J0didyxgjRAwIqP2ID3kKGzdvqe84kyjIs4HyQfYOmjkrrze-crCiTnixgSUJIf0UKVZgmvQ75Eo_Bl6DEfLU9TF9-475E8cqUGNjYTATLJVJJqWySNB6kUA-xv1ltrWo4j80KfDIeHrC4H_5ekuK9QxQhAxvj9Q_P7hDAT4RTMrofxM5qYQUWAPzhC0WP-cTojUGQUfhZBM448owrxCtZ01vN9jxWjo087lM5hcCnRcBL02IflDP6slH4jZfiC0WUuiDbCQaXnHP7N_2x4t8H9RY2Xbs7UzRP17UlcguQbXRT1XElhr0AuaDJRDMSn88Ai5HNunGj2yyqMNtAcvWouNUwqAud9jnG__Z_Exp1l7pVnYYSB-Ub2L5IXRayS5QKvxL9vyu6BntuXBYSR2a8nqQ5RwjMStfIcXj6a5sljEe5FpqKek4ZlKK3GVq-2gw-2b_dcP0s_PPp3DKJuLtomM_QrzMFzESn2Ues4L4ZfSSRvdfXpV90GmEsbKvnlyvbJdmKkAmwpH-GzctDI4Z8bBkSO1eFK1yZCGZTSFhgq6wTtag96vwP0rvpgOMzEVgnwqkgs7hGqPOdzrdhgqKRZu4Y61vLS31aj1ZcDOoaPHL52nPmkd4bKAA8W_LvnOSy28dLdpDOIj2afFRvTt51-fsn-_ICH1KfzO0ZR-szvBDmKjJB_QffwpggAygXKvEYnFkTP5gWr28VB64SU3lrVVNArqnrc6ZrDgYcQYVAqQz1JXvLXeXGVaRTGqi8K1eWqLiVWK0ronxlyU2gJ';

  // —— 样式 —— 
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
    #moduled-submit,
    #moduled-pause,
    #auto-submit-btn {
      padding: 8px 16px; font-size: 14px;
      border: none; color: #fff; border-radius: 4px; cursor: pointer;
    }
    #moduled-submit, #moduled-pause { background: #007bff; }
    #auto-submit-btn { background: #28a745; position: fixed; top: 100px; right: 30px; z-index:1000000; }
    table {
      width: 100%; border-collapse: collapse; margin-top: 8px; table-layout: fixed;
    }
    th, td {
      padding: 8px; border:1px solid #ddd; vertical-align: top; word-wrap: break-word;
    }
    th { background: #f5f5f5; font-weight: 500; text-align: left; }
    .product-cell { display: flex; align-items: flex-start; }
    .product-cell img {
      width: 60px; height: 60px; object-fit: cover;
      margin-right: 8px; border:1px solid #eee; border-radius:4px;
    }
    .product-cell .title {
      flex: 1; font-size:14px; line-height:1.4;
      overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
    }
    .moduled-tab { flex:1; text-align:center; padding:8px; cursor:pointer; font-weight:bold; }
    .moduled-tab.active { color:red; border-bottom:2px solid red; }
    .moduled-tab-panel { display:none; max-height:300px; overflow-y:auto; }
    .moduled-tab-panel.active { display:block; }
  `);

  // —— React Fiber Props 工具 —— 
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

  // —— 渲染“报名详情”视图 —— 
  function renderSubmitPage(config) {
    const d = document.getElementById('moduled-drawer');
    d.innerHTML = `
      <h2>报名详情 <span id="moduled-close">❌</span></h2>
      <div class="moduled-section">
        <p><strong>价格方式：</strong>${config.mode==='profit'?'利润率不低于':'价格不低于固定值'} ${config.priceVal}</p>
        <p><strong>活动库存：</strong>${config.stockVal||'默认'}</p>
      </div>
      <div class="moduled-section">
        <p><strong>当前活动：</strong>${config.current} / ${config.total}</p>
        <p><strong>报名成功：</strong>${config.success} / ${config.attempt}</p>
        <p><strong>未报名数量：</strong>${config.attempt - config.success}</p>
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
              <th style="width:10%">是否成功</th>
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

  // —— 填充首批商品列表 —— 
  function fillFirstProduct(data, config) {
    const tbody = document.getElementById('product-rows');
    tbody.innerHTML = '';
    data.forEach(item => {
      const siteInfo = item.activitySiteInfoList[0]||{};
      const skcInfo  = siteInfo.skcList[0]||{};
      const sku      = skcInfo.skuList[0]||{};
      const picUrl   = item.pictureUrl||'';
      const fullTitle= item.productName||'';
      const words    = fullTitle.split(/\s+/);
      const title    = words.slice(0,5).join(' ') + (words.length>5?'...':'');
      const skcId    = skcInfo.skcId||'';
      const ext      = sku.extCode||'';
      const daily    = sku.dailyPrice!=null ? (sku.dailyPrice/100).toFixed(2):'';
      const sug      = sku.suggestActivityPrice!=null ? (sku.suggestActivityPrice/100).toFixed(2):'';
      const meet     = (sku.suggestActivityPrice/100)>=config.priceVal?'是':'否';
      const stock    = meet==='是'?(config.stockVal||item.suggestActivityStock):'';
      tbody.innerHTML += `
        <tr data-product-id="${item.productId}">
          <td>
            <div class="product-cell">
              <img src="${picUrl}" />
              <div class="title" title="${fullTitle}">${title}</div>
            </div>
          </td>
          <td>${skcId}<br>货号:${ext}</td>
          <td>¥${daily}</td>
          <td>¥${sug}</td>
          <td>${meet}</td>
          <td>${stock}</td>
          <td></td>
        </tr>`;
    });
  }

  // —— 拉取并渲染首批商品 —— 
  function fetchAndRenderFirst(type, thematicId, config) {
    window.__moduled_config__ = config;
    renderSubmitPage(config);

    GM_xmlhttpRequest({
      method:'POST',
      url:'https://agentseller.temu.com/api/kiana/gamblers/marketing/enroll/semi/scroll/match',
      headers:{
        'Content-Type':'application/json',
        'mallid':MALLID,
        'anti-content':ANTI_CONTENT,
        'referer':location.href,
        'origin':location.origin,
        'cookie':document.cookie,
        'user-agent':navigator.userAgent
      },
      data:JSON.stringify({
        activityType:Number(type),
        activityThematicId:Number(thematicId),
        rowCount:50,
        addSite:true,
        searchScrollContext:''
      }),
      onload(res){
        try {
          const d = JSON.parse(res.responseText);
          if(d.success && d.result.matchList.length){
            fillFirstProduct(d.result.matchList, config);
          }
        } catch(e){ console.error(e); }
      },
      onerror(err){ console.error(err); }
    });
  }

  // —— 构建报名参数 —— 
  function buildPayload(type, thematicId, productList) {
    return {
      activityType:Number(type),
      activityThematicId:Number(thematicId),
      productList:productList.map(item=>({
        productId: item.productId,
        activityStock: item.stockVal,
        sessionIds: item.sessionIds,
        siteInfoList:[{
          siteId: item.siteId,
          skcList:[{
            skcId: item.skcId,
            skuList:[{
              skuId: item.skuId,
              activityPrice: item.activityPrice
            }]
          }]
        }]
      }))
    };
  }

  // —— 插入“自动提交报名”按钮 —— 
  function createAutoSubmitButton() {
    document.getElementById('auto-submit-btn')?.remove();
    const btn = document.createElement('button');
    btn.id = 'auto-submit-btn';
    btn.innerText = '🧠 自动提交报名';
    btn.onclick = submitEnrollment;
    document.body.appendChild(btn);
  }

  // —— 自动提交报名逻辑 —— 
  function submitEnrollment() {
    // 1. 取 type/thematicId
    let sel = document.querySelector('input[name="activity"]:checked');
    let type, them;
    if (sel) {
      type = sel.dataset.type;
      them = sel.dataset.thematicid;
    } else {
      const params = new URLSearchParams(location.search);
      type = params.get('type') || params.get('activityType') || '13';
      them = params.get('thematicId') || params.get('thematicid');
      if (!them) return alert('请先通过抽屉选择活动或打开正确的活动详情页');
    }

    // 2. 收集满足条件的商品
    const rows = document.querySelectorAll('#product-rows tr');
    const allItems = [];
    rows.forEach(tr => {
      if (tr.children[4].innerText.trim()==='是') {
        const pid     = Number(tr.dataset.productId);
        const [skc, ext] = tr.children[1].innerText.split('\n');
        const skcId   = Number(skc);
        const skuId   = Number(ext.split(':')[1]);
        const price   = Math.round(parseFloat(tr.children[3].innerText.slice(1))*100);
        const cfg     = window.__moduled_config__||{};
        const stock   = cfg.stockVal ? Number(cfg.stockVal) : Number(tr.children[5].innerText);
        const session = window.__moduled_sessionIds__||[];
        allItems.push({ productId:pid, skcId, skuId, activityPrice:price, stockVal:stock, siteId:100, sessionIds:session });
      }
    });
    if (!allItems.length) return alert('无满足条件商品可提交');

    // 3. 打印所有满足条件商品
    console.log('🆗 满足条件商品列表：', allItems);

    // 4. 只测试首条
    const first = allItems[0];
    console.log('🔨 测试首条：', first);
    if (!confirm(`即将测试提交首条 productId=${first.productId}，确认？`)) return;

    // 5. 构建并提交
    const payload = buildPayload(type, them, [ first ]);
    console.log('📤 测试 Payload：', payload);
    GM_xmlhttpRequest({
      method:'POST',
      url:'https://agentseller.temu.com/api/kiana/gamblers/marketing/enroll/semi/submit',
      headers:{
        'Content-Type':'application/json',
        'mallid':MALLID
      },
      data:JSON.stringify(payload),
      onload(res){
        const d = JSON.parse(res.responseText);
        console.log('🗳️ [/semi/submit] 返回：', d);
        if (d.success) {
          alert('✅ 测试报名成功，刷新校验中...');
          validateEnrollment(type, them);
        } else {
          alert('❌ 测试报名失败：'+d.errorMsg);
        }
      },
      onerror(err){
        console.error('❌ 提交异常：', err);
        alert('❌ 网络请求失败');
      }
    });
  }

  // —— 校验报名结果 —— 
  function validateEnrollment(type, them) {
    GM_xmlhttpRequest({
      method:'POST',
      url:'https://agentseller.temu.com/api/kiana/gamblers/marketing/enroll/activity/detail',
      headers:{
        'Content-Type':'application/json',
        'mallid':MALLID
      },
      data:JSON.stringify({ activityType:Number(type), activityThematicId:Number(them) }),
      onload(res){
        const d = JSON.parse(res.responseText);
        console.log('📋 [/activity/detail] 返回：', d);
        alert('✅ 报名已完成并刷新价格');
      }
    });
  }

  // —— 列表/详情页抽屉内容 —— 
  function fetchActivityData(){
    const longCon = document.getElementById('moduled-long');
    if(!longCon) return;
    longCon.innerHTML = '<div class="moduled-table-header"><div>类型</div><div>说明</div><div>选择</div></div>';
    document.querySelectorAll('.act-item_actItem__x2Uci').forEach(el=>{
      const name = el.querySelector('.act-item_activityName__Ryh3Y')?.innerText.trim()||'';
      const desc = el.querySelector('.act-item_activityContent__ju2KR')?.innerText.trim()||'';
      let t='', th='';
      try {
        const btn = el.querySelector('a[data-testid="beast-core-button-link"]');
        ({activityType:t,activityThematicId:th} = getReactProps(btn));
      }catch{}
      longCon.innerHTML += `
        <div class="moduled-table-row">
          <div>${name}</div><div>${desc}</div>
          <div><input type="radio" name="activity" data-type="${t}" data-thematicid="${th}" /></div>
        </div>`;
    });
  }
  async function fetchShortTermActivities(){
    const panels = [0,1,2].map(i=>document.getElementById('moduled-tab-'+i));
    const roots  = document.querySelectorAll('.TAB_tabContentInnerContainer_5-118-0');
    if(roots.length<2) return;
    const tabs   = roots[1].querySelectorAll('[data-testid="beast-core-tab-itemLabel-wrapper"]');
    for(let i=0;i<tabs.length;i++){
      tabs[i].click(); await new Promise(r=>setTimeout(r,400));
      panels[i].innerHTML = '<div class="moduled-table-header"><div>主题</div><div>报名时间</div><div>活动时间</div><div>已报名</div><div>选择</div></div>';
      document.querySelectorAll('[data-testid="beast-core-table-body-tr"]').forEach(row=>{
        const txt=row.querySelector('[data-testid="beast-core-table-td"]')?.innerText.trim()||'';
        let t='', th='';
        try {
          const btn = row.querySelector('a[data-testid="beast-core-button-link"]');
          ({activityType:t,activityThematicId:th} = getReactProps(btn));
        }catch{}
        panels[i].innerHTML += `
          <div class="moduled-table-row">
            <div>${txt}</div><div>–</div><div>–</div><div>–</div>
            <div><input type="radio" name="activity" data-type="${t}" data-thematicid="${th}" /></div>
          </div>`;
      });
    }
  }

  // —— 生成抽屉 —— 
  function createDrawer(isDetail){
    document.getElementById('moduled-drawer')?.remove();
    const d = document.createElement('div');
    d.id = 'moduled-drawer';

    let html = `
      <h2>活动报名 V4.9.1 <span id="moduled-close">❌</span></h2>
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

    if (!isDetail) {
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
      d.querySelector('#moduled-price-label').textContent =
        this.value==='profit'?'利润率不低于':'活动价格不低于';
    };

    if (!isDetail) {
      d.querySelectorAll('.moduled-tab').forEach(tab=>{
        tab.onclick = ()=>{
          d.querySelectorAll('.moduled-tab, .moduled-tab-panel').forEach(e=>e.classList.remove('active'));
          tab.classList.add('active');
          d.querySelector('#moduled-tab-'+tab.dataset.tab).classList.add('active');
        };
      });
      fetchActivityData();
      fetchShortTermActivities();
      d.querySelector('#moduled-submit').onclick = ()=>{
        const mode     = d.querySelector('#moduled-price-mode').value;
        const priceVal = Number(d.querySelector('#moduled-price-input').value.trim());
        if (!priceVal) return alert('请填写活动价格');
        const stockVal = d.querySelector('#moduled-stock-input').value.trim();
        const sel      = d.querySelector('input[name="activity"]:checked');
        if (!sel) return alert('请选择活动');
        fetchAndRenderFirst(sel.dataset.type, sel.dataset.thematicid, {
          mode, priceVal, stockVal, current:1, total:1, success:0, attempt:0
        });
        createAutoSubmitButton();
      };
    } else {
      d.querySelector('#moduled-submit').onclick = ()=>{
        const mode     = d.querySelector('#moduled-price-mode').value;
        const priceVal = Number(d.querySelector('#moduled-price-input').value.trim());
        if (!priceVal) return alert('请填写活动价格');
        const stockVal = d.querySelector('#moduled-stock-input').value.trim();
        const params   = new URLSearchParams(location.search);
        const type     = params.get('type')||'13';
        const them     = params.get('thematicId')||params.get('thematicid');
        fetchAndRenderFirst(type, them, {
          mode, priceVal, stockVal, current:1, total:1, success:0, attempt:0
        });
        createAutoSubmitButton();
      };
    }
  }

  // —— 决定用列表页还是详情页抽屉 —— 
  function produceDrawer(){
    const p        = location.pathname;
    const isList   = /^\/activity\/marketing-activity\/?$/.test(p);
    const isDetail = p.includes('/detail-new');
    if (!isList && !isDetail) {
      return alert('请打开营销活动列表或具体活动报名页面');
    }
    createDrawer(isDetail);
  }

  window.__moduled_plugin__ = produceDrawer;

})();
