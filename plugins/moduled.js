// ==UserScript==
// @name         活动报名插件 V4.8.9（示例预览 + 全量详情 + 暂停/继续）
// @namespace    https://yourdomain.com
// @version      4.8.9
// @description  保留 V4.8.8 功能，UI 调整：仅预览前5条符合条件商品，显示总数 & “查看本批详情”，右下悬浮暂停/继续按钮。
// @match        https://agentseller.temu.com/activity/marketing-activity*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function(){
  'use strict';

  const MALLID       = '634418223153529';
  const ANTI_CONTENT = '0aqAfoixYySYj9E2J0didyxgjRAwIqP2ID3kKGzdvqe84kyjIs4HyQfYOmjkrrze-crCiTnixgSUJIf0UKVZgmvQ75Eo_Bl6DEfLU9TF9-475E8cqUGNjYTATLJVJJqWySNB6kUA-xv1ltrWo4j80KfDIeHrC4H_5ekuK9QxQhAxvj9Q_P7hDAT4RTMrofxM5qYQUWAPzhC0WP-cTojUGQUfhZBM448owrxCtZ01vN9jxWjo087lM5hcCnRcBL02IflDP6slH4jZfiC0WUuiDbCQaXnHP7N_2x4t8H9RY2Xbs7UzRP17UlcguQbXRT1XElhr0AuaDJRDMSn88Ai5HNunGj2yyqMNtAcvWouNUwqAud9jnG__Z_Exp1l7pVnYYSB-Ub2L5IXRayS5QKvxL9vyu6BntuXBYSR2a8nqQ5RwjMStfIcXj6a5sljEe5FpqKek4ZlKK3GVq-2gw-2b_dcP0s_PPp3DKJuLtomM_QrzMFzESn2Ues4L4ZfSSRvdfXpV90GmEsbKvnlyvbJdmKkAmwpH-GzctDI4Z8bBkSO1eFK1yZCGZTSFhgq6wTtag96vwP0rvpgOMzEVgnwqkgs7hGqPOdzrdhgqKRZu4Y61vLS31aj1ZcDOoaPHL52nPmkd4bKAA8W_LvnOSy28dLdpDOIj2afFRvTt51-fsn-_ICH1KfzO0ZR-szvBDmKjJB_QffwpggAygXKvEYnFkTP5gWr28VB64SU3lrVVNArqnrc6ZrDgYcQYVAqQz1JXvLXeXGVaRTGqi8K1eWqLiVWK0ronxlyU2gJ';

  // —— 全局状态 —— 
  window.__moduled_queue__        = [];       // 剩余待提交队列
  window.__moduled_config__       = null;     // 当前批次配置
  window.__moduled_matchingList__ = [];       // 当前批次所有“符合条件”条目
  window.__moduled_paused__       = false;    // 暂停标志

  // —— 样式 —— 
  GM_addStyle(`
    /* 抽屉 & 基础样式 保留 V4.8.6 */
    #moduled-drawer { position:fixed; top:0; right:0; width:780px; height:100%; background:#fff; border-left:1px solid #ccc; z-index:999999; overflow-y:auto; font-family:Arial,sans-serif; box-shadow:-2px 0 8px rgba(0,0,0,0.2); }
    #moduled-drawer h2 { font-size:18px; padding:16px; margin:0; border-bottom:1px solid #eee; background:#fafafa; }
    #moduled-close { position:absolute; top:12px; right:12px; cursor:pointer; font-size:16px; }
    .moduled-section { padding:16px; border-bottom:1px solid #eee; }
    .moduled-input-group { margin-bottom:12px; }
    .moduled-input-group label { display:block; font-size:14px; margin-bottom:4px; }
    .moduled-input-group input, .moduled-input-group select { width:100%; padding:8px; font-size:14px; border:1px solid #ccc; border-radius:4px; }

    /* 表格 */
    table { width:100%; border-collapse:collapse; margin-top:8px; table-layout:fixed; }
    th, td { padding:8px; border:1px solid #ddd; vertical-align:top; word-wrap:break-word; }
    th { background:#f5f5f5; font-weight:500; text-align:left; }

    .product-cell { display:flex; align-items:flex-start; }
    .product-cell img { width:60px; height:60px; object-fit:cover; margin-right:8px; border:1px solid #eee; border-radius:4px; }
    .product-cell .title { flex:1; font-size:14px; line-height:1.4; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }

    /* 按钮 */
    #moduled-submit, #moduled-pause { padding:8px 16px; font-size:14px; border:none; color:#fff; border-radius:4px; cursor:pointer; }
    #moduled-submit { background:#007bff; }
    #moduled-pause { background:#dc3545; position:relative; }
    #moduled-pause.paused { background:#28a745 !important; }
    #auto-submit-btn { position:fixed; top:120px; right:30px; background:#28a745; color:#fff; padding:10px 16px; font-size:14px; border:none; border-radius:4px; cursor:pointer; z-index:1000000; }

    /* 详情按钮 */
    #show-full { margin-left:8px; padding:2px 6px; font-size:12px; }

  `);

  // —— React Props 辅助 —— 
  function getReactProps(dom){
    for(const k in dom){
      if(k.startsWith('__reactFiber$')||k.startsWith('__reactInternalInstance$')){
        const f = dom[k];
        return (f.return&&f.return.memoizedProps)||(f._currentElement&&f._currentElement.props)||{};
      }
    }
    return {};
  }

  // —— 渲染“报名详情”抽屉主体 —— 
  function renderSubmitPage(cfg){
    const d = document.getElementById('moduled-drawer');
    d.innerHTML = `
      <h2>报名详情 <span id="moduled-close">❌</span></h2>
      <div class="moduled-section">
        <p><strong>价格方式：</strong>${cfg.mode==='profit'? '利润率不低于' : '价格不低于'} ${cfg.priceVal}</p>
        <p><strong>活动库存：</strong>${cfg.stockVal||'默认'}</p>
      </div>
      <div class="moduled-section" id="batch-stats">
        <!-- 批次统计 -->
        <p id="stats-text">已批次：0/0 · 成功：0/0 · 剩余：0</p>
      </div>
      <div class="moduled-section">
        <table>
          <thead>
            <tr>
              <th style="width:30%">商品信息</th>
              <th style="width:15%">SKC</th>
              <th style="width:10%">日常价格</th>
              <th style="width:10%">申报价</th>
              <th style="width:10%">是否满足</th>
              <th style="width:10%">库存</th>
              <th style="width:15%">操作</th>
            </tr>
          </thead>
          <tbody id="product-rows">
            <tr><td colspan="7" align="center">正在加载示例…</td></tr>
          </tbody>
        </table>
      </div>
      <div class="moduled-section" style="text-align:center">
        <button id="moduled-pause">暂停</button>
      </div>
    `;
    d.querySelector('#moduled-close').onclick = ()=>d.remove();
    d.querySelector('#moduled-pause').onclick  = togglePause;
    updateStats(cfg,0,0,0);
  }

  // —— 更新批次统计文案 —— 
  function updateStats(cfg, batchIndex, successCount, totalCount){
    const p = document.getElementById('stats-text');
    p.innerText = `已批次：${batchIndex}/${cfg.totalBatches} · 成功：${successCount}/${totalCount} · 剩余：${totalCount-successCount}`;
  }

  // —— 渲染前 N 条示例 + “共 M 条”+“查看本批详情” —— 
  function renderPreview(list, cfg){
    const tb = document.getElementById('product-rows');
    tb.innerHTML = '';
    const previewCount = 5;
    const showCount = Math.min(previewCount, list.length);
    for(let i=0;i<showCount;i++){
      const it = list[i];
      tb.appendChild(renderRow(it));
    }
    // “…共 M 条 + 按钮”
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="7" align="right">…共 ${list.length} 条
                    <button id="show-full">查看本批详情</button></td>`;
    tb.appendChild(tr);
    document.getElementById('show-full').onclick = ()=>{
      renderFullTable(list);
    };
  }

  // —— 渲染完整表格 —— 
  function renderFullTable(list){
    const tb = document.getElementById('product-rows');
    tb.innerHTML = '';
    list.forEach(it=>{
      tb.appendChild(renderRow(it));
    });
  }

  // —— 单行渲染（示例 & 详情共用） —— 
  function renderRow(it){
    const tr = document.createElement('tr');
    const pic  = it.pictureUrl||'';
    const titleWords = (it.productName||'').split(/\s+/);
    const title = titleWords.slice(0,5).join(' ') + (titleWords.length>5?'...':'');
    const daily = it.dailyPrice!=null? (it.dailyPrice/100).toFixed(2):'';
    const sug   = it.suggestActivityPrice!=null? (it.suggestActivityPrice/100).toFixed(2):'';
    const meet  = (it.suggestActivityPrice/100)>=window.__moduled_config__.priceVal? '是':'否';
    const stock = meet==='是'? (window.__moduled_config__.stockVal||it.suggestActivityStock):'';
    tr.innerHTML = `
      <td>
        <div class="product-cell">
          <img src="${pic}" />
          <div class="title" title="${it.productName}">${title}</div>
        </div>
      </td>
      <td>${it.skcId}<br>货号:${it.extCode||''}</td>
      <td>¥${daily}</td>
      <td>¥${sug}</td>
      <td>${meet}</td>
      <td>${stock}</td>
      <td class="status"></td>
    `;
    return tr;
  }

  // —— 按钮插入 —— 
  function createAutoSubmitButton(){
    document.getElementById('auto-submit-btn')?.remove();
    const btn = document.createElement('button');
    btn.id    = 'auto-submit-btn';
    btn.innerText = '🧠 自动提交报名';
    btn.onclick   = submitEnrollment;
    document.body.appendChild(btn);
  }

  // —— 拉取一批 & 渲染示例 —— 
  async function fetchAndRenderFirst(type, them, cfg){
    // cfg 中约定 totalBatches，当前 batchIndex 皆由外部传入／或简单估算
    window.__moduled_config__ = cfg;
    renderSubmitPage(cfg);
    createAutoSubmitButton();

    GM_xmlhttpRequest({
      method:'POST',
      url:'https://agentseller.temu.com/api/kiana/gamblers/marketing/enroll/semi/scroll/match',
      headers:{
        'Content-Type':'application/json',
        'mallid': MALLID,
        'anti-content': ANTI_CONTENT,
        'referer': location.href,
        'origin': location.origin,
        'cookie': document.cookie
      },
      data: JSON.stringify({
        activityType: Number(type),
        activityThematicId: Number(them),
        rowCount: 50,
        addSite: true,
        searchScrollContext: ''
      }),
      onload(res){
        const d = JSON.parse(res.responseText);
        if(!d.success){
          console.error('/scroll/match 返回失败：', d);
          return alert('❌ 拉取商品失败，请稍后重试');
        }
        const rawList = d.result.matchList||[];
        // map 为后续提交所需字段
        const mapped = rawList.map(it=>{
          const sku = it.activitySiteInfoList[0]?.skcList[0]?.skuList[0]||{};
          return {
            productId: it.productId,
            pictureUrl: it.pictureUrl,
            productName: it.productName,
            skcId: it.activitySiteInfoList[0]?.skcList[0]?.skcId,
            extCode: sku.extCode,
            dailyPrice: sku.dailyPrice,
            suggestActivityPrice: sku.suggestActivityPrice,
            suggestActivityStock: it.suggestActivityStock,
            enrollSessionIdList: it.enrollSessionIdList||[],
            // 记录原数据以便状态更新
            raw: it
          };
        });
        // 过滤符合条件
        const meetList = mapped.filter(it=>{
          return (it.suggestActivityPrice||0)/100 >= cfg.priceVal;
        });
        window.__moduled_matchingList__ = meetList;
        window.__moduled_queue__        = [...meetList];
        console.log('🆗 满足条件商品列表：', meetList);

        // 渲染前5条预览
        renderPreview(meetList, cfg);
        // 更新批次统计： 假设当前批次=1，总共=1（如需多批请自行修改 cfg.totalBatches）
        updateStats(cfg, 1, 0, meetList.length);
      },
      onerror(err){
        console.error('🛑 拉取失败：', err);
        alert('网络请求失败');
      }
    });
  }

  // —— 点击“🧠 自动提交报名” —— 
  function submitEnrollment(){
    if(window.__moduled_queue__.length===0){
      return alert('无满足条件的商品或已全部提交完毕');
    }
    window.__moduled_paused__ = false;
    togglePause(); // 会触发一次 processQueue
  }

  // —— 循环提交队列 —— 
  function processQueue(type, them){
    if(window.__moduled_paused__) return;
    const item = window.__moduled_queue__.shift();
    if(!item){
      alert('✅ 全部提交完毕');
      return;
    }
    // 构造 payload
    const payload = {
      activityType: Number(type),
      activityThematicId: Number(them),
      productList: [{
        productId:     item.productId,
        activityStock: Number(window.__moduled_config__.stockVal||item.suggestActivityStock),
        sessionIds:    item.enrollSessionIdList,
        siteInfoList: [{
          siteId: 100,
          skcList: [{
            skcId:      item.skcId,
            skuList: [{
              skuId:         item.raw.activitySiteInfoList[0]?.skcList[0]?.skuList[0]?.skuId,
              activityPrice: Math.round(item.suggestActivityPrice)
            }]
          }]
        }]
      }]
    };
    console.log('📤 提交 payload：', payload);

    GM_xmlhttpRequest({
      method:'POST',
      url:'https://agentseller.temu.com/api/kiana/gamblers/marketing/enroll/semi/submit',
      headers:{ 'Content-Type':'application/json', 'mallid':MALLID },
      data: JSON.stringify(payload),
      onload(res){
        const d = JSON.parse(res.responseText);
        console.log('📋 提交返回：', d);
        // 找到对应行并标记 ✔/✘
        const rows = document.querySelectorAll('#product-rows tr');
        // 如果已展开全表，则行数匹配 index，否则在预览区内可能不对应，暂不复杂定位
        const statusCells = document.querySelectorAll('#product-rows .status');
        const idx = statusCells.length - window.__moduled_queue__.length - 1;
        if(statusCells[idx]){
          statusCells[idx].innerText = d.success ? '✅' : '❌';
        }
        // 继续下一条
        // 延时 12–23 秒后执行
        const delay = 12000 + Math.random()*11000;
        setTimeout(()=>{
          processQueue(type, them);
        }, delay);
      },
      onerror(err){
        console.error('❌ 提交失败：', err);
        // 继续下一条（可按需 retry）
        processQueue(type, them);
      }
    });
  }

  // —— 切换 暂停 / 继续 —— 
  function togglePause(){
    window.__moduled_paused__ = !window.__moduled_paused__;
    const btn = document.getElementById('moduled-pause');
    if(window.__moduled_paused__){
      btn.classList.add('paused');
      btn.innerText = '继续';
    } else {
      btn.classList.remove('paused');
      btn.innerText = '暂停';
      // 继续提交，当前 URL 解析一次 type/them
      const params = new URLSearchParams(location.search);
      const type  = params.get('type') || '13';
      const them  = params.get('thematicId') || params.get('thematicid');
      processQueue(type, them);
    }
  }

  // —— 列表/详情页抽屉逻辑 —— 
  function fetchActivityData(){
    const longCon = document.getElementById('moduled-long');
    if(!longCon) return;
    longCon.innerHTML = '<div class="moduled-table-header"><div>类型</div><div>说明</div><div>选择</div></div>';
    document.querySelectorAll('.act-item_actItem__x2Uci').forEach(el=>{
      const name = el.querySelector('.act-item_activityName__Ryh3Y')?.innerText.trim()||'';
      const desc = el.querySelector('.act-item_activityContent__ju2KR')?.innerText.trim()||'';
      let type='', themVal='';
      try{
        const btn = el.querySelector('a[data-testid="beast-core-button-link"]');
        ({activityType:type, activityThematicId:themVal} = getReactProps(btn));
      }catch{}
      longCon.innerHTML += `
        <div class="moduled-table-row">
          <div>${name}</div><div>${desc}</div>
          <div><input type="radio" name="activity" data-type="${type}" data-thematicid="${themVal}" /></div>
        </div>`;
    });
  }
  async function fetchShortTermActivities(){
    const panels = [0,1,2].map(i=>document.getElementById('moduled-tab-'+i));
    const roots = document.querySelectorAll('.TAB_tabContentInnerContainer_5-118-0');
    if(roots.length<2) return;
    const tabs = roots[1].querySelectorAll('[data-testid="beast-core-tab-itemLabel-wrapper"]');
    for(let i=0;i<tabs.length;i++){
      tabs[i].click(); await new Promise(r=>setTimeout(r,400));
      panels[i].innerHTML = '<div class="moduled-table-header"><div>主题</div><div>报名时间</div><div>活动时间</div><div>已报名</div><div>选择</div></div>';
      document.querySelectorAll('[data-testid="beast-core-table-body-tr"]').forEach(row=>{
        const txt = row.querySelector('[data-testid="beast-core-table-td"]')?.innerText.trim()||'';
        let type='', themVal='';
        try{
          const btn = row.querySelector('a[data-testid="beast-core-button-link"]');
          ({activityType:type, activityThematicId:themVal} = getReactProps(btn));
        }catch{}
        panels[i].innerHTML += `
          <div class="moduled-table-row">
            <div>${txt}</div><div>–</div><div>–</div><div>–</div>
            <div><input type="radio" name="activity" data-type="${type}" data-thematicid="${themVal}" /></div>
          </div>`;
      });
    }
  }

  function createDrawer(isDetail){
    document.getElementById('moduled-drawer')?.remove();
    const d = document.createElement('div'); d.id = 'moduled-drawer';
    let html = `
      <h2>活动报名 V4.8.9 <span id="moduled-close">❌</span></h2>
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
    d.querySelector('#moduled-close').onclick = ()=>d.remove();
    d.querySelector('#moduled-price-mode').onchange = function(){
      d.querySelector('#moduled-price-label').innerText =
        this.value==='profit'? '利润率不低于' : '活动价格不低于';
    };

    if(!isDetail){
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
        const priceVal = Number(d.querySelector('#moduled-price-input').value);
        if(!priceVal) return alert('请填写活动价格');
        const stockVal = d.querySelector('#moduled-stock-input').value;
        const sel = d.querySelector('input[name="activity"]:checked');
        if(!sel) return alert('请选择活动');
        // cfg.totalBatches 可根据 total 条数 / 50 计算，这里简化为 1
        const cfg = { mode, priceVal, stockVal, totalBatches:1 };
        fetchAndRenderFirst(sel.dataset.type, sel.dataset.thematicid, cfg);
      };
    } else {
      d.querySelector('#moduled-submit').onclick = ()=>{
        const mode     = d.querySelector('#moduled-price-mode').value;
        const priceVal = Number(d.querySelector('#moduled-price-input').value);
        if(!priceVal) return alert('请填写活动价格');
        const stockVal = d.querySelector('#moduled-stock-input').value;
        const params = new URLSearchParams(location.search);
        const type   = params.get('type')||'13';
        const them   = params.get('thematicId')||params.get('thematicid');
        const cfg    = { mode, priceVal, stockVal, totalBatches:1 };
        fetchAndRenderFirst(type, them, cfg);
      };
    }
  }

  function produceDrawer(){
    const p       = location.pathname;
    const isList   = /^\/activity\/marketing-activity\/?$/.test(p);
    const isDetail = p.includes('/detail-new');
    if(!isList && !isDetail){
      return alert('请打开营销活动列表或具体活动报名页面');
    }
    createDrawer(isDetail);
  }

  // 暴露全局入口
  window.__moduled_plugin__ = produceDrawer;

})();
