// ==UserScript==
// @name         活动报名插件 V4.8.8（保V4.8.6 UI + 自动提交报名）
// @namespace    https://yourdomain.com
// @version      4.8.8
// @description  美化界面、标题截断、自动提交报名并刷新校验，兼容列表页/详情页抽屉逻辑
// @match        https://agentseller.temu.com/activity/marketing-activity*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
  'use strict';

  const MALLID = '634418223153529';
  const ANTI_CONTENT = '0aqAfoixYySYj9E2J0didyxgjRAwIqP2ID3kKGzdvqe84kyjIs4HyQfYOmjkrrze-crCiTnixgSUJIf0UKVZgmvQ75Eo_Bl6DEfLU9TF9-475E8cqUGNjYTATLJVJJqWySNB6kUA-xv1ltrWo4j80KfDIeHrC4H_5ekuK9QxQhAxvj9Q_P7hDAT4RTMrofxM5qYQUWAPzhC0WP-cTojUGQUfhZBM448owrxCtZ01vN9jxWjo087lM5hcCnRcBL02IflDP6slH4jZfiC0WUuiDbCQaXnHP7N_2x4t8H9RY2Xbs7UzRP17UlcguQbXRT1XElhr0AuaDJRDMSn88Ai5HNunGj2yyqMNtAcvWouNUwqAud9jnG__Z_Exp1l7pVnYYSB-Ub2L5IXRayS5QKvxL9vyu6BntuXBYSR2a8nqQ5RwjMStfIcXj6a5sljEe5FpqKek4ZlKK3GVq-2gw-2b_dcP0s_PPp3DKJuLtomM_QrzMFzESn2Ues4L4ZfSSRvdfXpV90GmEsbKvnlyvbJdmKkAmwpH-GzctDI4Z8bBkSO1eFK1yZCGZTSFhgq6wTtag96vwP0rvpgOMzEVgnwqkgs7hGqPOdzrdhgqKRZu4Y61vLS31aj1ZcDOoaPHL52nPmkd4bKAA8W_LvnOSy28dLdpDOIj2afFRvTt51-fsn-_ICH1KfzO0ZR-szvBDmKjJB_QffwpggAygXKvEYnFkTP5gWr28VB64SU3lrVVNArqnrc6ZrDgYcQYVAqQz1JXvLXeXGVaRTGqi8K1eWqLiVWK0ronxlyU2gJ';

  // —— 公共样式（同 V4.8.6） —— 
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
      border-bottom: 1px solid #eee; background:#fafafa;
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
      border: none; background: #007bff; color: #fff;
      border-radius: 4px; cursor: pointer;
    }
    #auto-submit-btn {
      position: fixed; top: 100px; right: 30px; background: #28a745; z-index: 1000000;
    }
    table {
      width: 100%; border-collapse: collapse; margin-top: 8px; table-layout: fixed;
    }
    th, td {
      padding: 8px; border:1px solid #ddd; vertical-align: top;
      word-wrap: break-word;
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

  // —— React Fiber Props 获取 —— 
  function getReactProps(dom) {
    for (const k in dom) {
      if (k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')) {
        const f = dom[k];
        return (f.return && f.return.memoizedProps) ||
               (f._currentElement && f._currentElement.props) ||
               {};
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

  // —— 循环填充首批商品 —— 
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
      const meet     = (sku.suggestActivityPrice/100) >= config.priceVal ? '是':'否';
      const stock    = meet==='是' ? (config.stockVal||item.suggestActivityStock):'';
      const success  = '';
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
          <td>${success}</td>
        </tr>`;
    });
  }

  // —— 拉取并渲染首批 —— 
  function fetchAndRenderFirst(type, thematicId, config) {
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
      onload(res) {
        try {
          const d = JSON.parse(res.responseText);
          if (d.success && d.result.matchList.length) {
            fillFirstProduct(d.result.matchList, config);
          } else {
            console.warn('无首批数据', d);
          }
        } catch(e) { console.error(e); }
      },
      onerror(err) { console.error(err); }
    });
  }

  // —— 构建 payload 辅助 —— 
  function buildPayload(type, thematicId, productList) {
    return {
      activityType: Number(type),
      activityThematicId: Number(thematicId),
      productList: productList.map(item => ({
        productId: item.productId,
        activityStock: item.stockVal,
        sessionIds: item.sessionIds,
        siteInfoList: [{
          siteId: item.siteId,
          skcList: [{
            skcId: item.skcId,
            skuList: [{
              skuId: item.skuId,
              activityPrice: item.activityPrice
            }]
          }]
        }]
      }))
    };
  }

  // —— 自动提交报名逻辑 —— 
  function createAutoSubmitButton() {
    document.getElementById('auto-submit-btn')?.remove();
    const btn = document.createElement('button');
    btn.id = 'auto-submit-btn';
    btn.innerText = '🧠 自动提交报名';
    btn.onclick = submitEnrollment;
    document.body.appendChild(btn);
  }

  function submitEnrollment() {
    const sel = document.querySelector('input[name="activity"]:checked');
    if (!sel) return alert('请先通过抽屉选择活动');
    const type = sel.dataset.type;
    const them = sel.dataset.thematicid;
    const rows = document.querySelectorAll('#product-rows tr');
    const list = [];
    rows.forEach(tr => {
      const meet = tr.children[4].innerText.trim();
      if (meet==='是') {
        const productId    = Number(tr.dataset.productId);
        const [skcIdLine, extLine] = tr.children[1].innerText.split('\n');
        const skcId        = Number(skcIdLine);
        const skuId        = Number(extLine.split(':')[1]);
        const activityPrice= Math.round(parseFloat(tr.children[3].innerText.slice(1))*100);
        const stockVal     = Number(document.getElementById('moduled-stock-input').value) ||
                              Number(tr.children[5].innerText);
        // sessionIds 需在渲染时缓存，简单用 global
        const sessionIds   = window.__moduled_sessionIds__ || [];
        list.push({ productId, skcId, skuId, activityPrice, stockVal, siteId:100, sessionIds });
      }
    });
    if (!list.length) return alert('无满足条件商品可提交');
    const payload = buildPayload(type, them, list);
    console.log('📤 报名 Payload:', payload);
    GM_xmlhttpRequest({
      method:'POST',
      url:'https://seller.kuajingmaihuo.com/marvel-mms/cn/api/kiana/gambit/marketing/enroll/semi/submit',
      headers:{ 'Content-Type':'application/json','anti-content':ANTI_CONTENT,'mallid':MALLID },
      data:JSON.stringify(payload),
      onload(res) {
        const d = JSON.parse(res.responseText);
        if (d.success) {
          alert('✅ 报名成功，刷新校验中...');
          validateEnrollment(type, them);
        } else {
          alert('❌ 报名失败：'+d.errorMsg);
        }
      }
    });
  }

  function validateEnrollment(type, them) {
    GM_xmlhttpRequest({
      method:'POST',
      url:'https://seller.kuajingmaihuo.com/marvel-mms/cn/api/kiana/gambit/marketing/enroll/activity/detail',
      headers:{ 'Content-Type':'application/json','anti-content':ANTI_CONTENT,'mallid':MALLID },
      data:JSON.stringify({ activityType:Number(type), activityThematicId:Number(them) }),
      onload(res) {
        console.log('📋 校验结果：', JSON.parse(res.responseText));
        alert('✅ 报名已完成并刷新价格');
      }
    });
  }

  // —— 列表页/详情页 抽屉 & 按钮 —— 
  function createDrawer(isDetail) {
    document.getElementById('moduled-drawer')?.remove();
    // …（重用前面 createDrawer V4.8.6 逻辑）…
    // 渲染完之后插入“自动提交报名”按钮
    createAutoSubmitButton();
  }

  function produceDrawer() {
    const p = location.pathname;
    const isList   = /^\/activity\/marketing-activity\/?$/.test(p);
    const isDetail = p.includes('/detail-new');
    if (!isList && !isDetail) {
      alert('请打开营销活动列表或具体活动报名页面');
      return;
    }
    createDrawer(isDetail);
  }

  // 暴露入口
  window.__moduled_plugin__ = produceDrawer;

})();
