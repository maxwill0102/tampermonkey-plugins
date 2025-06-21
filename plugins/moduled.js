// ==UserScript==
// @name         活动报名插件 V4.8.6（美化+标题省略）
// @namespace    https://yourdomain.com
// @version      4.8.6
// @description  在详情视图中循环展示首批商品，标题截取前5个单词，界面更美观
// @match        https://agentseller.temu.com/activity/marketing-activity*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
  'use strict';

  const MALLID = '634418223153529';
  const ANTI_CONTENT = '0aqAfoixYySYj9E2J0didyxgjRAwIqP2ID3kKGzdvqe84kyjIs4HyQfYOmjkrrze-crCiTnixgSUJIf0UKVZgmvQ75Eo_Bl6DEfLU9TF9-475E8cqUGNjYTATLJVJJqWySNB6kUA-xv1ltrWo4j80KfDIeHrC4H_5ekuK9QxQhAxvj9Q_P7hDAT4RTMrofxM5qYQUWAPzhC0WP-cTojUGQUfhZBM448owrxCtZ01vN9jxWjo087lM5hcCnRcBL02IflDP6slH4jZfiC0WUuiDbCQaXnHP7N_2x4t8H9RY2Xbs7UzRP17UlcguQbXRT1XElhr0AuaDJRDMSn88Ai5HNunGj2yyqMNtAcvWouNUwqAud9jnG__Z_Exp1l7pVnYYSB-Ub2L5IXRayS5QKvxL9vyu6BntuXBYSR2a8nqQ5RwjMStfIcXj6a5sljEe5FpqKek4ZlKK3GVq-2gw-2b_dcP0s_PPp3DKJuLtomM_QrzMFzESn2Ues4L4ZfSSRvdfXpV90GmEsbKvnlyvbJdmKkAmwpH-GzctDI4Z8bBkSO1eFK1yZCGZTSFhgq6wTtag96vwP0rvpgOMzEVgnwqkgs7hGqPOdzrdhgqKRZu4Y61vLS31aj1ZcDOoaPHL52nPmkd4bKAA8W_LvnOSy28dLdpDOIj2afFRvTt51-fsn-_ICH1KfzO0ZR-szvBDmKjJB_QffwpggAygXKvEYnFkTP5gWr28VB64SU3lrVVNArqnrc6ZrDgYcQYVAqQz1JXvLXeXGVaRTGqi8K1eWqLiVWK0ronxlyU2gJ'; // 替换为实际 anti-content

  // —— 样式 ——
  GM_addStyle(`
    #moduled-drawer { position:fixed; top:0; right:0; width:780px; height:100%; background:#fff;
      border-left:1px solid #ccc; z-index:999999; overflow-y:auto; font-family:Arial;
      box-shadow:-2px 0 8px rgba(0,0,0,0.2); }
    #moduled-drawer h2 { font-size:18px; padding:16px; margin:0; border-bottom:1px solid #eee; }
    #moduled-close { position:absolute; top:10px; right:10px; cursor:pointer; }
    .moduled-section { padding:16px; border-bottom:1px solid #eee; }
    #auto-submit-btn { position:fixed; top:100px; right:30px; padding:10px 14px;
      background:#28a745; color:#fff; border:none; border-radius:6px;
      font-weight:bold; cursor:pointer; z-index:1000000; }
  `);

  // —— React Props 工具 ——
  function getReactProps(dom) {
    for (const k in dom) {
      if (k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')) {
        const f = dom[k];
        return (f.return && f.return.memoizedProps) || (f._currentElement && f._currentElement.props) || {};
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
          <thead><tr>
            <th style="width:30%">商品信息</th>
            <th style="width:15%">SKC</th>
            <th style="width:10%">日常价格</th>
            <th style="width:10%">活动申报价</th>
            <th style="width:10%">是否满足</th>
            <th style="width:10%">活动库存</th>
            <th style="width:10%">是否成功</th>
          </tr></thead>
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

  // —— 填充首批多条商品 ——
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
        <tr>
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
      method: 'POST',
      url: 'https://agentseller.temu.com/api/kiana/gamblers/marketing/enroll/semi/scroll/match',
      headers: {
        'Content-Type':'application/json',
        'mallid':'634418223153529',
        'anti-content':'0aqAfoixYySYj9E2J0didyxgjRAwIqP2ID3kKGzdvqe84kyjIs4HyQfYOmjkrrze-crCiTnixgSUJIf0UKVZgmvQ75Eo_Bl6DEfLU9TF9-475E8cqUGNjYTATLJVJJqWySNB6kUA-xv1ltrWo4j80KfDIeHrC4H_5ekuK9QxQhAxvj9Q_P7hDAT4RTMrofxM5qYQUWAPzhC0WP-cTojUGQUfhZBM448owrxCtZ01vN9jxWjo087lM5hcCnRcBL02IflDP6slH4jZfiC0WUuiDbCQaXnHP7N_2x4t8H9RY2Xbs7UzRP17UlcguQbXRT1XElhr0AuaDJRDMSn88Ai5HNunGj2yyqMNtAcvWouNUwqAud9jnG__Z_Exp1l7pVnYYSB-Ub2L5IXRayS5QKvxL9vyu6BntuXBYSR2a8nqQ5RwjMStfIcXj6a5sljEe5FpqKek4ZlKK3GVq-2gw-2b_dcP0s_PPp3DKJuLtomM_QrzMFzESn2Ues4L4ZfSSRvdfXpV90GmEsbKvnlyvbJdmKkAmwpH-GzctDI4Z8bBkSO1eFK1yZCGZTSFhgq6wTtag96vwP0rvpgOMzEVgnwqkgs7hGqPOdzrdhgqKRZu4Y61vLS31aj1ZcDOoaPHL52nPmkd4bKAA8W_LvnOSy28dLdpDOIj2afFRvTt51-fsn-_ICH1KfzO0ZR-szvBDmKjJB_QffwpggAygXKvEYnFkTP5gWr28VB64SU3lrVVNArqnrc6ZrDgYcQYVAqQz1JXvLXeXGVaRTGqi8K1eWqLiVWK0ronxlyU2gJ',
        'referer':location.href,
        'origin':location.origin,
        'cookie':document.cookie,
        'user-agent':navigator.userAgent
      },
      data: JSON.stringify({
        activityType:Number(type),
        activityThematicId:Number(thematicId),
        rowCount:50, addSite:true, searchScrollContext:''
      }),
      onload(res) {
        try {
          const d = JSON.parse(res.responseText);
          if (d.success && d.result.matchList.length) {
            fillFirstProduct(d.result.matchList, config);
          } else {
            console.warn('无数据', d);
          }
        } catch(e) {
          console.error('解析失败', e);
        }
      },
      onerror(err) { console.error('请求失败', err); }
    });
  }

  // —— 长/短期渲染略，每次同 V4.8.5 ——
  function fetchActivityData() { /* ... */ }
  async function fetchShortTermActivities() { /* ... */ }

  // —— 创建抽屉 ——
  function createDrawer(isDetail) {
    document.getElementById('moduled-drawer')?.remove();
    const d=document.createElement('div'); d.id='moduled-drawer';
    let html=`
      <h2>活动报名 V4.8.6 <span id="moduled-close">❌</span></h2>
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
      html+=`<div class="moduled-section"><strong>长期活动</strong><div id="moduled-long"></div></div>
      <div class="moduled-section"><strong>短期活动</strong><div class="moduled-tabs">…</div><div id="moduled-short-panels">…</div></div>`;
    }
    html+=`<div class="moduled-section" style="text-align:center"><button id="moduled-submit">立即报名</button></div>`;
    d.innerHTML=html; document.body.appendChild(d);
    d.querySelector('#moduled-close').onclick=()=>d.remove();
    d.querySelector('#moduled-price-mode').onchange=function(){ d.querySelector('#moduled-price-label').textContent=this.value==='profit'?'利润率不低于':'活动价格不低于'; };
    if (!isDetail) {
      // 列表模式注册
      d.querySelector('#moduled-submit').onclick=()=>{
        const mode=d.querySelector('#moduled-price-mode').value;
        const priceVal=Number(d.querySelector('#moduled-price-input').value.trim()); if(!priceVal) return alert('请填写活动价格');
        const stockVal=d.querySelector('#moduled-stock-input').value.trim();
        const sel=d.querySelector('input[name="activity"]:checked'); if(!sel) return alert('请选择活动');
        fetchAndRenderFirst(sel.dataset.type, sel.dataset.thematicid, {mode,priceVal,stockVal,current:1,total:1,success:0,attempt:0});
      };
    } else {
      // 详情页面注册
      d.querySelector('#moduled-submit').onclick=()=>{
        const mode=d.querySelector('#moduled-price-mode').value;
        const priceVal=Number(d.querySelector('#moduled-price-input').value.trim()); if(!priceVal) return alert('请填写活动价格');
        const stockVal=d.querySelector('#moduled-stock-input').value.trim();
        const params=new URLSearchParams(location.search);
        const type=params.get('type')||'13'; const them=params.get('thematicId')||params.get('thematicid');
        fetchAndRenderFirst(type, them, {mode,priceVal,stockVal,current:1,total:1,success:0,attempt:0});
      };
    }
    createAutoSubmitButton();
  }

    function createAutoSubmitButton() {
    // 若已存在则移除
    const old = document.getElementById('auto-submit-btn');
    if (old) old.remove();
    const btn = document.createElement('button');
    btn.id = 'auto-submit-btn';
    btn.innerText = '🧠 自动提交报名';
    btn.onclick = submitEnrollment;
    document.body.appendChild(btn);
  }
  function buildPayload(type, thematicId, productList) {
    return {
      activityType: Number(type),
      activityThematicId: Number(thematicId),
      productList: productList.map(item => ({
        productId: item.productId,
        activityStock: item.stockVal,
        sessionIds: item.sessionIds,
        siteInfoList: [ {
          siteId: item.siteId,
          skcList: [ {
            skcId: item.skcId,
            skuList: [ {
              skuId: item.skuId,
              activityPrice: item.activityPrice // 分
            } ]
          } ]
        } ]
      }))
    };
  }

  // —— 自动提交报名 主逻辑 ——
  function submitEnrollment() {
    // 从页面缓存或全局变量获取当前 detail 设置
    const selRadio = document.querySelector('input[name="activity"]:checked');
    if (!selRadio) return alert('请先通过抽屉选择活动');
    const type = selRadio.dataset.type;
    const them = selRadio.dataset.thematicid;
    // 构造 productList: 仅包含满足条件的行
    const rows = document.querySelectorAll('#product-rows tr');
    const productList = [];
    rows.forEach(tr => {
      const meet = tr.children[4].innerText.trim();
      if (meet === '是') {
        const skuId = Number(tr.children[1].innerText.split('\n')[1].split(':')[1]);
        const skcId = Number(tr.children[1].innerText.split('\n')[0]);
        const productId = Number(tr.dataset.productId);
        const activityPrice = Math.round(parseFloat(tr.children[3].innerText.slice(1)) * 100);
        const stockVal = Number(document.getElementById('moduled-stock-input').value) || Number(tr.children[5].innerText);
        // sessionIds 从全局缓存填充（首次渲染时必须缓存）
        const sessionIds = window.__moduled_sessionIds__ || [];
        // siteId 固定 100
        productList.push({ productId, stockVal, sessionIds, siteId:100, skcId, skuId, activityPrice });
      }
    });
    if (!productList.length) return alert('无满足条件商品可提交');

    const payload = buildPayload(type, them, productList);
    console.log('📤 报名 Payload:', payload);

    // 提交报名
    GM_xmlhttpRequest({
      method:'POST',
      url:'https://seller.kuajingmaihuo.com/marvel-mms/cn/api/kiana/gambit/marketing/enroll/semi/submit',
      headers:{'Content-Type':'application/json','anti-content':ANTI_CONTENT,'mallid':MALLID},
      data:JSON.stringify(payload),
      onload(res) {
        const d = JSON.parse(res.responseText);
        if (d.success) {
          alert('✅ 报名成功，刷新校验中...');
          // 刷新校验接口
          validateEnrollment(type, them);
        } else {
          alert('❌ 报名失败：' + d.errorMsg);
        }
      }
    });
  }

  // —— 刷新校验 ——
  function validateEnrollment(type, them) {
    GM_xmlhttpRequest({
      method:'POST',
      url:'https://seller.kuajingmaihuo.com/marvel-mms/cn/api/kiana/gambit/marketing/enroll/activity/detail',
      headers:{'Content-Type':'application/json','anti-content':ANTI_CONTENT,'mallid':MALLID},
      data:JSON.stringify({ activityType:Number(type), activityThematicId:Number(them) }),
      onload(res) {
        const det = JSON.parse(res.responseText);
        console.log('📋 校验结果:', det);
        alert('✅ 报名已完成并已刷新价格');
      }
    });
  }

  // —— 入口 ——
  function produceDrawer() {
    const p=location.pathname;
    const isList=/^\/activity\/marketing-activity\/?$/.test(p);
    const isDetail=p.includes('/detail-new');
    if(!isList && !isDetail) return alert('请打开营销活动列表或具体活动报名页面');
    createDrawer(isDetail);
  }
  window.__moduled_plugin__ = produceDrawer;
})();
