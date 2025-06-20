// ==UserScript==
// @name         活动报名插件 V4.5（测试首批商品抓取，步骤1-3）
// @namespace    https://yourdomain.com
// @version      4.5.0
// @description  落地 步骤1-3：渲染活动列表 -> 选中活动 -> 拉取首批商品并打印
// @match        https://*.kuajingmaihuo.com/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
  'use strict';

  // 基础样式，抽屉宽高与原生页面保持一致
  GM_addStyle(`
    #moduled-drawer { position: fixed; top:0; right:0; width:780px; height:100%; background:#fff; border-left:1px solid #ccc; z-index:999999; overflow-y:auto; font-family:Arial; box-shadow:-2px 0 8px rgba(0,0,0,0.2); }
    #moduled-drawer h2 { font-size:18px; padding:16px; margin:0; border-bottom:1px solid #eee; }
    #moduled-close { position:absolute; top:10px; right:10px; cursor:pointer; }
    .moduled-section { padding:16px; border-bottom:1px solid #eee; }
    .moduled-input-group { margin-bottom:10px; }
    .moduled-input-group input { width:100%; padding:6px; font-size:14px; }
    .moduled-tabs { display:flex; border-bottom:1px solid #ccc; margin-bottom:10px; }
    .moduled-tab { flex:1; text-align:center; padding:8px; cursor:pointer; }
    .moduled-tab.active { color:red; border-bottom:2px solid red; }
    .moduled-tab-panel { display:none; max-height:300px; overflow-y:auto; }
    .moduled-tab-panel.active { display:block; }
  `);

  /**
   * 步骤3: 抓取首批商品数据
   */
  function fetchFirstBatch(type, thematicId) {
    const cookie = document.cookie;
    const mallid = '634418223153529';
    const anti = '0aqAfoiZYiGNy99Vjnmalvu7E_DKXGD36t7WjztF-KvkIvZS7gtjNceMGjmyhEy5Enyd3amas7m62JyBoZlDctJAWctxBiL6KrW7gMp_5uAs4cv5vmnCywX15gpCSjyaePYMkkfTk5Z3jovwUfB9Lkb541qt-_tmsBwGsi7wme1fF3zXdcPbMTJI4gDlO4B8gzz4j8I1F7cO5bJKMic3JAzHlAEnhEH30U8XI8tLm34524m9AKXnqYCNA8esGoEkKlyMv3oPEVVLa4dAjxBkpbBRjjCTV8cCeFoI0domkovdXNxo71HJRGtHGBIEoAdzYhuiO3WPQZ9CzjB2RUtkX_5nBBBl_hCqbg5mUfBqlmxGWOemZxxDZBYa1UmVSvW0vIMK2WPoG3y1XhYslgNKcpLcq_YYHTWwUpkqIBS2K_8RalJY51OoxXXMWLbL8RAQZo83Qe-gN7nuMV-6XwnAKVm3QzSvMOkA4Ju7rjqh7aSqo0BZE6hPrzTgTq'; // TODO: 替换为实际 anti-content
    const body = {
      activityType: Number(type),
      activityThematicId: Number(thematicId),
      rowCount: 50,
      addSite: true,
      searchScrollContext: ''
    };
    console.log(`📣 测试抓取：type=${type}, thematicId=${thematicId}`);
    GM_xmlhttpRequest({
      method: 'POST',
      url: 'https://agentseller.temu.com/api/kiana/gamblers/marketing/enroll/semi/scroll/match',
      headers: {
        'Content-Type': 'application/json',
        'cookie': cookie,
        'mallid': mallid,
        'referer': `https://agentseller.temu.com/activity/marketing-activity/detail-new?type=${type}&thematicId=${thematicId}`,
        'anti-content': anti,
        'origin': 'https://agentseller.temu.com',
        'user-agent': navigator.userAgent
      },
      data: JSON.stringify(body),
      onload(res) {
        try {
          const data = JSON.parse(res.responseText);
          if (data.success && data.result && data.result.matchList) {
            console.log('✅ 首批商品列表：', data.result.matchList);
          } else {
            console.error('❌ 接口异常返回：', data);
          }
        } catch (e) {
          console.error('❌ JSON 解析失败：', e);
        }
      },
      onerror(err) {
        console.error('❌ 请求失败：', err);
      }
    });
  }

  /**
   * 步骤1: 渲染长期 & 短期活动列表，并附带 data-type 与 data-thematicid
   */
  function createDrawer() {
    // 清除旧抽屉
    const old = document.getElementById('moduled-drawer');
    if (old) old.remove();

    const drawer = document.createElement('div');
    drawer.id = 'moduled-drawer';
    drawer.innerHTML = `
      <h2>活动报名 V4.5 <span id="moduled-close">❌</span></h2>
      <div class="moduled-section">
        <div class="moduled-input-group">
          <input type="text" id="moduled-activity-url" placeholder="输入活动链接或ID" />
        </div>
      </div>
      <div class="moduled-section">
        <strong>长期活动</strong>
        <div id="moduled-long"></div>
      </div>
      <div class="moduled-section">
        <strong>短期活动</strong>
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
      </div>
      <div style="text-align:center; padding:16px;">
        <button id="moduled-submit">立即报名</button>
      </div>
    `;
    document.body.appendChild(drawer);

    // 关闭按钮
    document.getElementById('moduled-close').onclick = () => drawer.remove();

    // 渲染长期活动
    const longCon = document.getElementById('moduled-long');
    longCon.innerHTML = '';
    document.querySelectorAll('.act-item_actItem__x2Uci').forEach((el, idx) => {
      const link = el.querySelector('a')?.href || '';
      const url = new URL(link);
      const type = url.searchParams.get('type') || '13';
      const themId = url.searchParams.get('thematicId') || '';
      const name = el.querySelector('.act-item_activityName__Ryh3Y')?.innerText.trim() || `活动${idx}`;
      longCon.innerHTML += `
        <div>
          <label>
            <input type="radio" name="activity" data-type="${type}" data-thematicid="${themId}" /> ${name}
          </label>
        </div>
      `;
    });

    // 短期活动延迟渲染
    (async function() {
      const panels = [0,1,2].map(i => document.getElementById('moduled-tab-'+i));
      const roots = document.querySelectorAll('.TAB_tabContentInnerContainer_5-118-0');
      if (roots.length < 2) return;
      const tabs = roots[1].querySelectorAll('[data-testid="beast-core-tab-itemLabel-wrapper"]');
      const delay = ms=>new Promise(r=>setTimeout(r,ms));
      for (let i=0; i<tabs.length && i<panels.length; i++) {
        tabs[i].click();
        await delay(800);
        const panel = panels[i];
        panel.innerHTML = '';
        document.querySelectorAll('[data-testid="beast-core-table-body-tr"]').forEach((row,j) => {
          const link = row.querySelector('a')?.href || '';
          const url = new URL(link);
          const type = url.searchParams.get('type') || '13';
          const themId = url.searchParams.get('thematicId') || '';
          const txt = row.querySelector('[data-testid="beast-core-table-td"]')?.innerText.trim() || `项目${i}-${j}`;
          panel.innerHTML += `
            <div>
              <label>
                <input type="radio" name="activity" data-type="${type}" data-thematicid="${themId}" /> ${txt}
              </label>
            </div>
          `;
        });
      }
    })();

    // 步骤2 + 步骤3: 提交按钮
    document.getElementById('moduled-submit').onclick = () => {
      const sel = document.querySelector('input[name="activity"]:checked');
      if (!sel) return alert('请选择一个活动');
      const type = sel.dataset.type;
      const themId = sel.dataset.thematicid;
      console.log('🔍 选中活动参数：', { type, thematicId: themId });
      fetchFirstBatch(type, themId);
    };
  }

  // 暴露入口
  window.__moduled_plugin__ = createDrawer;
})();
