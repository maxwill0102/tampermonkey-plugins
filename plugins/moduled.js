// ==UserScript==
// @name         活动报名插件 V4.9.1（分批拉取+分批提交）
// @namespace    https://yourdomain.com
// @version      4.9.1
// @description  每次拉 50 条，提取满足条件的商品批量报名，提交完再继续拉下一批，直至结束。带状态展示。
// @match        https://agentseller.temu.com/activity/marketing-activity*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
  'use strict';

  const MALLID       = '634418223153529';
  const ANTI_CONTENT = '0aqAfoixYySYj9E2J0didyxgjRAwIqP2ID3kKGzdvqe84kyjIs4HyQfYOmjkrrze-crCiTnixgSUJIf0UKVZgmvQ75Eo_Bl6DEfLU9TF9-475E8cqUGNjYTATLJVJJqWySNB6kUA-xv1ltrWo4j80KfDIeHrC4H_5ekuK9QxQhAxvj9Q_P7hDAT4RTMrofxM5qYQUWAPzhC0WP-cTojUGQUfhZBM448owrxCtZ01vN9jxWjo087lM5hcCnRcBL02IflDP6slH4jZfiC0WUuiDbCQaXnHP7N_2x4t8H9RY2Xbs7UzRP17UlcguQbXRT1XElhr0AuaDJRDMSn88Ai5HNunGj2yyqMNtAcvWouNUwqAud9jnG__Z_Exp1l7pVnYYSB-Ub2L5IXRayS5QKvxL9vyu6BntuXBYSR2a8nqQ5RwjMStfIcXj6a5sljEe5FpqKek4ZlKK3GVq-2gw-2b_dcP0s_PPp3DKJuLtomM_QrzMFzESn2Ues4L4ZfSSRvdfXpV90GmEsbKvnlyvbJdmKkAmwpH-GzctDI4Z8bBkSO1eFK1yZCGZTSFhgq6wTtag96vwP0rvpgOMzEVgnwqkgs7hGqPOdzrdhgqKRZu4Y61vLS31aj1ZcDOoaPHL52nPmkd4bKAA8W_LvnOSy28dLdpDOIj2afFRvTt51-fsn-_ICH1KfzO0ZR-szvBDmKjJB_QffwpggAygXKvEYnFkTP5gWr28VB64SU3lrVVNArqnrc6ZrDgYcQYVAqQz1JXvLXeXGVaRTGqi8K1eWqLiVWK0ronxlyU2gJ';

  // —— 样式（保留 V4.8.6 全部样式 + 新状态列） —— 
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
    #moduled-submit { padding: 8px 16px; font-size:14px;
      background:#007bff;color:#fff;border:none;border-radius:4px;cursor:pointer;
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
    .status { text-align:center; font-size:18px; }
  `);

  // —— React Fiber Props 工具 —— 
  function getReactProps(dom) {
    for (let k in dom) {
      if (k.startsWith('__reactFiber$')||k.startsWith('__reactInternalInstance$')) {
        let f = dom[k];
        return (f.return&&f.return.memoizedProps)
            ||(f._currentElement&&f._currentElement.props)
            ||{};
      }
    }
    return {};
  }

  // —— 渲染抽屉界面 —— 
  function createDrawer(isDetail) {
    document.getElementById('moduled-drawer')?.remove();
    const d = document.createElement('div');
    d.id = 'moduled-drawer';
    d.innerHTML = `
      <h2>活动报名 V4.9.1 <span id="moduled-close">❌</span></h2>
      <div class="moduled-section" id="moduled-settings">
        <div class="moduled-input-group">
          <label>价格方式</label>
          <select id="moduled-price-mode"><option value="fixed">不低于</option><option value="profit">利润率不低于</option></select>
        </div>
        <div class="moduled-input-group">
          <label id="moduled-price-label">活动价格不低于</label>
          <input type="number" id="moduled-price-input" placeholder="必填"/>
        </div>
        <div class="moduled-input-group">
          <label>活动库存（选填）</label>
          <input type="number" id="moduled-stock-input" placeholder="默认"/>
        </div>
      </div>
      ${!isDetail?`
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
      </div>`:''}
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
              <th style="width:5%">状态</th>
            </tr>
          </thead>
          <tbody id="product-rows">
            <tr><td colspan="7" align="center">请先点击“立即报名”</td></tr>
          </tbody>
        </table>
      </div>
      <div class="moduled-section" style="text-align:center">
        <button id="moduled-submit">立即报名</button>
      </div>
    `;
    document.body.appendChild(d);
    // 关闭
    d.querySelector('#moduled-close').onclick = ()=>d.remove();
    // 切换价格方式文字
    d.querySelector('#moduled-price-mode').onchange = function(){
      d.querySelector('#moduled-price-label').textContent =
        this.value==='profit'?'利润率不低于':'活动价格不低于';
    };
    // 绑定 长/短 活动
    if(!isDetail){
      fetchLongActivity();
      fetchShortActivity();
      d.querySelectorAll('.moduled-tab').forEach(tab=>{
        tab.onclick = ()=>{
          d.querySelectorAll('.moduled-tab,.moduled-tab-panel').forEach(e=>e.classList.remove('active'));
          tab.classList.add('active');
          d.querySelector('#moduled-tab-'+tab.dataset.tab).classList.add('active');
        };
      });
    }
    // “立即报名”按钮
    d.querySelector('#moduled-submit').onclick = onStart;
  }

  // —— 拉长期活动列表 —— 
  function fetchLongActivity(){
    const con = document.getElementById('moduled-long');
    con.innerHTML = '<div class="moduled-table-header"><div>类型</div><div>说明</div><div>选择</div></div>';
    document.querySelectorAll('.act-item_actItem__x2Uci').forEach(el=>{
      const name = el.querySelector('.act-item_activityName__Ryh3Y')?.innerText||'';
      const desc = el.querySelector('.act-item_activityContent__ju2KR')?.innerText||'';
      let props={}; try{
        props = getReactProps(el.querySelector('a[data-testid="beast-core-button-link"]'));
      }catch{}
      con.innerHTML += `
        <div class="moduled-table-row">
          <div>${name}</div><div>${desc}</div>
          <div><input type="radio" name="activity"
            data-type="${props.activityType||''}"
            data-thematicid="${props.activityThematicId||''}"/></div>
        </div>`;
    });
  }

  // —— 拉短期活动列表 —— 
  async function fetchShortActivity(){
    const panels = [0,1,2].map(i=>document.getElementById('moduled-tab-'+i));
    const roots  = document.querySelectorAll('.TAB_tabContentInnerContainer_5-118-0');
    if(roots.length<2) return;
    const tabs   = roots[1].querySelectorAll('[data-testid="beast-core-tab-itemLabel-wrapper"]');
    for(let i=0;i<tabs.length;i++){
      tabs[i].click(); await new Promise(r=>setTimeout(r,400));
      panels[i].innerHTML = '<div class="moduled-table-header"><div>主题</div><div>报名</div><div>时间</div><div>已报</div><div>选</div></div>';
      document.querySelectorAll('[data-testid="beast-core-table-body-tr"]').forEach(row=>{
        const txt = row.querySelector('[data-testid="beast-core-table-td"]')?.innerText||'';
        let props={}; try{
          props = getReactProps(row.querySelector('a[data-testid="beast-core-button-link"]'));
        }catch{}
        panels[i].innerHTML += `
          <div class="moduled-table-row">
            <div>${txt}</div><div>–</div><div>–</div><div>–</div>
            <div><input type="radio" name="activity"
              data-type="${props.activityType||''}"
              data-thematicid="${props.activityThematicId||''}"/></div>
          </div>`;
      });
    }
  }

  // —— 点击“立即报名”触发入口 —— 
  function onStart(){
    const d    = document.getElementById('moduled-drawer');
    const mode = d.querySelector('#moduled-price-mode').value;
    const priceVal = Number(d.querySelector('#moduled-price-input').value);
    if(!priceVal) return alert('请填写活动价格');
    const stockVal = d.querySelector('#moduled-stock-input').value;
    // 活动 type/them
    let type, them;
    const sel = d.querySelector('input[name="activity"]:checked');
    if(sel){
      type = sel.dataset.type;
      them = sel.dataset.thematicid;
    } else {
      const p = new URLSearchParams(location.search);
      type = p.get('type')||p.get('activityType')||'13';
      them = p.get('thematicId')||p.get('thematicid');
    }
    if(!them) return alert('请选择活动或打开详情页');
    // 存配置
    window.__moduled_cfg__ = { mode, priceVal, stockVal };
    // 清表+初始化
    const tb = document.getElementById('product-rows');
    tb.innerHTML = `<tr><td colspan="7" align="center">正在拉取并提交，请稍候…</td></tr>`;
    // 从头开始
    fetchChunkAndSubmit(type, them, '', window.__moduled_cfg__);
  }

  // —— 分批拉 & 提交 —— 
  function fetchChunkAndSubmit(type, them, scrollCtx, cfg) {
    console.log('▶️ 批次 /match scrollCtx=', scrollCtx);
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
        activityType: Number(type),
        activityThematicId: Number(them),
        rowCount: 50,
        addSite: true,
        searchScrollContext: scrollCtx
      }),
      onload(res){
        let d; try { d = JSON.parse(res.responseText); }
        catch(e){ return console.error('❌ 解析 /match 失败', e); }
        console.log('🔔 /match 返回：', d);
        if(!d.success){
          return alert('拉取失败：'+d.errorMsg);
        }
        const list = d.result.matchList||[];
        appendRows(list, cfg);
        // 筛选出“是”的那几条
        const toSubmit = list.filter(item=>{
          const sug = item.activitySiteInfoList[0]?.skcList[0]?.skuList[0]?.suggestActivityPrice||0;
          return (sug/100) >= cfg.priceVal;
        });
        if(toSubmit.length){
          // 构造并提交这一批
          const payload = buildPayload(type, them, toSubmit, cfg);
          console.log('📤 本批提交 payload：', payload);
          GM_xmlhttpRequest({
            method:'POST',
            url:'https://agentseller.temu.com/api/kiana/gamblers/marketing/enroll/semi/submit',
            headers:{ 'Content-Type':'application/json','mallid':MALLID },
            data: JSON.stringify(payload),
            onload(res2){
              let r2; try{ r2 = JSON.parse(res2.responseText); }
              catch(e){return console.error('❌ 解析 /submit 失败',e);}
              console.log('🔔 /submit 返回：', r2);
              // 标记这一批在表格中的状态
              markBatchStatus(list, r2);
              // 下一批
              if(d.result.hasMore && d.result.searchScrollContext){
                fetchChunkAndSubmit(type, them, d.result.searchScrollContext, cfg);
              } else {
                console.log('✅ 全部批次处理完毕');
                alert('所有批次提交完毕！');
              }
            },
            onerror(err2){
              console.error('❌ /submit 网络失败', err2);
              alert('提交网络错误，终止循环');
            }
          });
        } else {
          console.log('ℹ️ 本批无满足条件商品');
          // 直接下一批
          if(d.result.hasMore && d.result.searchScrollContext){
            fetchChunkAndSubmit(type, them, d.result.searchScrollContext, cfg);
          } else {
            console.log('✅ 全部批次处理完毕（无任何满足条件的）');
            alert('所有批次拉取完毕，没有任何可提交商品');
          }
        }
      },
      onerror(err){
        console.error('❌ /match 网络失败', err);
        alert('拉取网络错误，终止');
      }
    });
  }

  // —— 把这一批的商品追加到表格并预留“状态”列 —— 
  function appendRows(list, cfg) {
    const tb = document.getElementById('product-rows');
    if(tb.rows[0]?.cells.length !== 7){
      tb.innerHTML = '';
    }
    list.forEach(item=>{
      const site = item.activitySiteInfoList[0]||{};
      const skc  = site.skcList[0]||{};
      const sku  = skc.skuList[0]||{};
      const pic  = item.pictureUrl||'';
      const full = item.productName||'';
      const words= full.split(/\s+/).slice(0,5);
      const title= words.join(' ') + (full.split(/\s+/).length>5?'...':'');
      const daily= sku.dailyPrice!=null ? (sku.dailyPrice/100).toFixed(2):'';
      const sug  = sku.suggestActivityPrice!=null ? (sku.suggestActivityPrice/100).toFixed(2):'';
      const meet = (sku.suggestActivityPrice/100)>=cfg.priceVal?'是':'否';
      const stock= meet==='是'? (cfg.stockVal||item.suggestActivityStock):'';
      const tr = document.createElement('tr');
      tr.innerHTML = `
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
        <td class="status">…</td>`;
      // 存原始对象引用
      tr._item = item;
      tb.appendChild(tr);
    });
  }

  // —— 构造 payload —— 
  function buildPayload(type, them, arr, cfg) {
    return {
      activityType: Number(type),
      activityThematicId: Number(them),
      productList: arr.map(item=>{
        const sku = item.activitySiteInfoList[0]?.skcList[0]?.skuList[0]||{};
        return {
          productId: item.productId,
          activityStock: cfg.stockVal||item.suggestActivityStock,
          sessionIds: item.suggestEnrollSessionIdList.length
                      ? item.suggestEnrollSessionIdList
                      : item.enrollSessionIdList||[],
          siteInfoList: [{
            siteId: item.activitySiteInfoList[0]?.siteId||100,
            skcList: [{
              skcId: item.activitySiteInfoList[0]?.skcList[0]?.skcId,
              skuList: [{
                skuId: sku.skuId,
                activityPrice: sku.suggestActivityPrice||0
              }]
            }]
          }]
        };
      })
    };
  }

  // —— 标记本批次的状态 —— 
  function markBatchStatus(list, resp) {
    // resp.result.productId2EnrollIdMap 中成功的 key
    const okMap = (resp.result?.productId2EnrollIdMap)||{};
    const tb    = document.getElementById('product-rows');
    // 遍历最近追加的行（尾部 N 条）
    const rows  = Array.from(tb.querySelectorAll('tr')).slice(-list.length);
    rows.forEach((tr, idx)=>{
      const pid = list[idx].productId;
      if(okMap[pid]){
        tr.querySelector('.status').innerText = '✅';
      } else {
        tr.querySelector('.status').innerText = '❌';
      }
    });
  }

  // —— 入口判断 —— 
  function produceDrawer(){
    const p = location.pathname;
    const isList   = /^\/activity\/marketing-activity\/?$/.test(p);
    const isDetail = p.includes('/detail-new');
    if(!isList && !isDetail){
      return alert('请打开营销活动列表或具体活动报名页面');
    }
    createDrawer(isDetail);
  }

  // 暴露给控制台或按钮
  window.__moduled_plugin__ = produceDrawer;
  console.log('插件 moduled V4.9.1 加载完毕，执行 __moduled_plugin__() 打开抽屉');
})();
