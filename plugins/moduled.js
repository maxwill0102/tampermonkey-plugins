// ==UserScript==
// @name         活动报名插件 V4.8.8（保V4.8.6 UI + 自动提交报名 + 暂停/继续/关闭）
// @namespace    https://yourdomain.com
// @version      4.8.8
// @description  美化界面、标题截断、自动提交报名并刷新校验，兼容列表页/详情页抽屉逻辑，新增暂停/继续/关闭功能。
// @match        https://agentseller.temu.com/activity/marketing-activity*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
  'use strict';

  const MALLID       = '634418223153529';
  const ANTI_CONTENT = '0aqAfoixYySYj9E2J0didyxgjRAwIqP2ID3kKGzdvqe84kyjIs4HyQfYOmjkrrze-crCiTnixgSUJIf0UKVZgmvQ75Eo_Bl6DEfLU9TF9-475E8cqUGNjYTATLJVJJqWySNB6kUA-xv1ltrWo4j80KfDIeHrC4H_5ekuK9QxQhAxvj9Q_P7hDAT4RTMrofxM5qYQUWAPzhC0WP-cTojUGQUfhZBM448owrxCtZ01vN9jxWjo087lM5hcCnRcBL02IflDP6slH4jZfiC0WUuiDbCQaXnHP7N_2x4t8H9RY2Xbs7UzRP17UlcguQbXRT1XElhr0AuaDJRDMSn88Ai5HNunGj2yyqMNtAcvWouNUwqAud9jnG__Z_Exp1l7pVnYYSB-Ub2L5IXRayS5QKvxL9vyu6BntuXBYSR2a8nqQ5RwjMStfIcXj6a5sljEe5FpqKek4ZlKK3GVq-2gw-2b_dcP0s_PPp3DKJuLtomM_QrzMFzESn2Ues4L4ZfSSRvdfXpV90GmEsbKvnlyvbJdmKkAmwpH-GzctDI4Z8bBkSO1eFK1yZCGZTSFhgq6wTtag96vwP0rvpgOMzEVgnwqkgs7hGqPOdzrdhgqKRZu4Y61vLS31aj1ZcDOoaPHL52nPmkd4bKAA8W_LvnOSy28dLdpDOIj2afFRvTt51-fsn-_ICH1KfzO0ZR-szvBDmKjJB_QffwpggAygXKvEYnFkTP5gWr28VB64SU3lrVVNArqnrc6ZrDgYcQYVAqQz1JXvLXeXGVaRTGqi8K1eWqLiVWK0ronxlyU2gJ';

  // —— 全局队列 & 暂停标志 —— 
  window.__moduled_queue__  = [];
  window.__moduled_paused__ = false;

  // —— 样式（保留 V4.8.6 样式 + 暂停/继续/关闭） —— 
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
    #moduled-submit { background: #007bff; }
    #moduled-pause { background: #dc3545; }
    #moduled-pause.paused { background: #28a745; }
    #auto-submit-btn {
      background: #28a745;
      position: fixed; top: 100px; right: 30px; z-index:1000000;
    }
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
  function renderSubmitPage(cfg) {
    const d = document.getElementById('moduled-drawer');
    d.innerHTML = `
      <h2>报名详情 <span id="moduled-close">❌</span></h2>
      <div class="moduled-section">
        <p><strong>价格方式：</strong>${cfg.mode==='profit'?'利润率不低于':'价格不低于'} ${cfg.priceVal}</p>
        <p><strong>活动库存：</strong>${cfg.stockVal||'默认'}</p>
      </div>
      <div class="moduled-section">
        <p><strong>当前活动：</strong>${cfg.current} / ${cfg.total}</p>
        <p><strong>报名成功：</strong>${cfg.success} / ${cfg.attempt}</p>
        <p><strong>未报名数量：</strong>${cfg.attempt - cfg.success}</p>
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
              <th style="width:10%">状态</th>
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
    d.querySelector('#moduled-pause').onclick  = togglePause;
  }

  // —— 填充首批商品 —— 
  function fillFirstProduct(list, cfg) {
    window.__moduled_rawItems__ = list;
    const tb = document.getElementById('product-rows');
    tb.innerHTML = '';
    list.forEach((item, idx) => {
      const site = item.activitySiteInfoList[0]||{};
      const skc  = site.skcList[0]||{};
      const sku  = skc.skuList[0]||{};
      const pic  = item.pictureUrl||'';
      const words = (item.productName||'').split(/\s+/);
      const title = words.slice(0,5).join(' ') + (words.length>5?'...':'');
      const daily = sku.dailyPrice!=null ? (sku.dailyPrice/100).toFixed(2) : '';
      const sug   = sku.suggestActivityPrice!=null ? (sku.suggestActivityPrice/100).toFixed(2) : '';
      const meet  = (sku.suggestActivityPrice/100)>=cfg.priceVal ? '是' : '否';
      const stock = meet==='是' ? (cfg.stockVal||item.suggestActivityStock) : '';
      tb.innerHTML += `
        <tr data-idx="${idx}">
          <td>
            <div class="product-cell">
              <img src="${pic}" /><div class="title" title="${item.productName}">${title}</div>
            </div>
          </td>
          <td>${skc.skcId}<br>货号:${sku.extCode||''}</td>
          <td>¥${daily}</td>
          <td>¥${sug}</td>
          <td>${meet}</td>
          <td>${stock}</td>
          <td class="status"></td>
        </tr>`;
    });
  }

  // —— 拉取并渲染首批 —— 
  function fetchAndRenderFirst(type, them, cfg) {
    window.__moduled_config__ = cfg;
    renderSubmitPage(cfg);
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
      data: JSON.stringify({
        activityType:+type,
        activityThematicId:+them,
        rowCount:50,
        addSite:true
      }),
      onload(res){
        const d = JSON.parse(res.responseText);
        if(d.success && d.result.matchList) {
          fillFirstProduct(d.result.matchList, cfg);
        }
      }
    });
  }

  // —— 点击“🧠 自动提交报名” 时 —— 
  function submitEnrollment() {
    // 1) 获得活动 type/them
    let type, them;
    const sel = document.querySelector('input[name="activity"]:checked');
    if(sel) {
      type = sel.dataset.type; them = sel.dataset.thematicid;
    } else {
      const p = new URLSearchParams(location.search);
      type = p.get('type')||'13';
      them = p.get('thematicId')||p.get('thematicid');
      if(!them) return alert('请先选择活动或打开详情页');
    }

    // 2) 收集“是”的商品到队列
    const cfg  = window.__moduled_config__;
    const raws = window.__moduled_rawItems__||[];
    const queue = [];
    document.querySelectorAll('#product-rows tr').forEach(tr=>{
      if(tr.children[4].innerText==='是') {
        const idx  = +tr.dataset.idx;
        const raw  = raws[idx];
        const skc  = raw.activitySiteInfoList[0]?.skcList[0]||{};
        const sku  = skc.skuList[0]||{};
        const price= Math.round((sku.suggestActivityPrice||0)/1); // 单位已是分
        const stock= cfg.stockVal?+cfg.stockVal:raw.suggestActivityStock;
        const sess = raw.suggestEnrollSessionIdList.length
                     ? raw.suggestEnrollSessionIdList
                     : raw.enrollSessionIdList||[];
        queue.push({
          productId: raw.productId,
          skcId: skc.skcId,
          skuId: sku.skuId,
          activityPrice: price,
          stockVal: stock,
          siteId: 100,
          sessionIds: sess
        });
      }
    });
    if(queue.length===0) return alert('无可提交商品');
    window.__moduled_queue__  = queue;
    window.__moduled_paused__ = false;
    updatePauseBtn();
    processQueue(+type, +them);
  }

  // —— 列队处理 —— 
  function processQueue(type, them) {
    if(window.__moduled_paused__) return;
    const it = window.__moduled_queue__.shift();
    if(!it) {
      // 全部完成 → 切换成“关闭”
      updatePauseBtn();
      return;
    }
    submitSingle(type, them, it)
      .then(()=> processQueue(type, them))
      .catch(()=> processQueue(type, them));
  }

  // —— 提交单条 —— 
  function submitSingle(type, them, it) {
    const payload = {
      activityType: type,
      activityThematicId: them,
      productList: [{
        productId: it.productId,
        activityStock: it.stockVal,
        sessionIds: it.sessionIds,
        siteInfoList: [{
          siteId: it.siteId,
          skcList: [{
            skcId: it.skcId,
            skuList: [{ skuId: it.skuId, activityPrice: it.activityPrice }]
          }]
        }]
      }]
    };
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method:'POST',
        url:'https://agentseller.temu.com/api/kiana/gamblers/marketing/enroll/semi/submit',
        headers:{ 'Content-Type':'application/json','mallid':MALLID },
        data:JSON.stringify(payload),
        onload(res){
          const d = JSON.parse(res.responseText);
          // 更新表格行状态
          const rows = document.querySelectorAll('#product-rows tr');
          const row  = rows[rows.length - window.__moduled_queue__.length - 1];
          if(d.success) {
            row && (row.querySelector('.status').innerText = '✅');
          } else {
            row && (row.querySelector('.status').innerText = '❌');
          }
          resolve();
        },
        onerror(err){
          reject(err);
        }
      });
    });
  }

  // —— 切换 暂停 / 继续 / 关闭 —— 
  function togglePause() {
    window.__moduled_paused__ = !window.__moduled_paused__;
    updatePauseBtn();
    if(!window.__moduled_paused__) {
      // 继续执行
      const sel  = document.querySelector('input[name="activity"]:checked');
      const type = sel? +sel.dataset.type : +new URLSearchParams(location.search).get('type');
      const them = sel? +sel.dataset.thematicid : +new URLSearchParams(location.search).get('thematicId');
      processQueue(type, them);
    }
  }

  function updatePauseBtn() {
    const b = document.getElementById('moduled-pause');
    if(!b) return;
    if(!window.__moduled_queue__.length) {
      // 队列空 → 关闭
      b.classList.remove('paused');
      b.innerText = '关闭';
      b.onclick = () => document.getElementById('moduled-drawer').remove();
    }
    else if(window.__moduled_paused__) {
      b.classList.add('paused');
      b.innerText = '继续';
    } else {
      b.classList.remove('paused');
      b.innerText = '暂停';
    }
  }

  // —— 列表/详情页 抽屉逻辑 & ReactProps & 短/长期活动抓取 同原版 —— 
  // …（此处不变，直接沿用你现有的 fetchActivityData、fetchShortTermActivities、createDrawer、produceDrawer）…

  window.__moduled_plugin__ = produceDrawer;
})();
