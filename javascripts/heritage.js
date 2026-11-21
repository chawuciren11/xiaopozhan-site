(function () {
  "use strict";

  const app = document.getElementById("heritage-app");
  if (!app) return;

  const remoteBase = (document.querySelector('meta[name="account-api-base"]')?.content || "").replace(/\/$/, "");
  const apiBase = remoteBase ? `${remoteBase}/api/heritage` : (app.dataset.apiBase || "/api/heritage").replace(/\/$/, "");
  const staticIndex = document.querySelector('meta[name="heritage-static-index"]')?.content;
  const staticBase = !remoteBase && staticIndex ? new URL(staticIndex, window.location.href) : null;
  const params = new URLSearchParams(window.location.search);
  const selectedSlug = params.get("post");

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatDate(value) {
    if (!value) return "日期未知";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("zh-CN");
  }

  function errorView(message) {
    app.innerHTML = `
      <div class="heritage-state heritage-state--error">
        <strong>暂时无法读取帖子</strong>
        <p>${escapeHtml(message)}</p>
        <button class="md-button" type="button" data-heritage-retry>重新加载</button>
      </div>`;
    app.querySelector("[data-heritage-retry]")?.addEventListener("click", () => load(true));
  }

  async function readerView(post, notice, storage) {
    const pdfUrl = staticBase ? new URL(post.pdf_url, staticBase).href : `${apiBase}/posts/${encodeURIComponent(post.slug)}/pdf`;
    const htmlUrl = staticBase ? new URL(post.html_url, staticBase).href : `${apiBase}/posts/${encodeURIComponent(post.slug)}/html`;
    document.title = `${post.title} - 传承 - 小破站`;
    app.innerHTML = `
      <section class="heritage-reader">
        <div class="heritage-reader__toolbar">
          <a class="heritage-back" href="./">← 返回传承目录</a>
          <div>
            <h2>${escapeHtml(post.title)}</h2>
            <p>${escapeHtml(post.author)} · ${escapeHtml(formatDate(post.published_at))}</p>
          </div>
          <a class="md-button" href="${pdfUrl}" target="_blank" rel="noopener">单独打开 PDF</a>
        </div>
        ${storage === "demo" ? `<div class="heritage-notice">${escapeHtml(notice)}</div>` : ""}
        <article class="heritage-document" aria-live="polite">
          <div class="heritage-loading" role="status"><span class="heritage-loading__dot"></span>正在渲染正文……</div>
        </article>
      </section>`;

    const response = await fetch(htmlUrl, { headers: { Accept: "application/json" } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.detail || `正文渲染失败：${response.status}`);
    app.querySelector(".heritage-document").innerHTML = payload.html || "<p>正文为空。</p>";
  }

  function cardsView(posts, notice, storage) {
    const cards = posts
      .map((post) => {
        const tags = (post.tags || [])
          .slice(0, 3)
          .map((tag) => `<span>${escapeHtml(tag)}</span>`)
          .join("");
        return `
          <a class="heritage-card" href="?post=${encodeURIComponent(post.slug)}">
            <div class="heritage-card__topline">
              <span class="heritage-card__format">${post.format === "markdown" ? "MARKDOWN" : "纯文本"}</span>
              <time>${escapeHtml(formatDate(post.published_at))}</time>
            </div>
            <h2>${escapeHtml(post.title)}</h2>
            <p>${escapeHtml(post.summary)}</p>
            <div class="heritage-card__tags">${tags}</div>
            <div class="heritage-card__footer">
              <span>作者 · ${escapeHtml(post.author)}</span>
              <strong>阅读全文 →</strong>
            </div>
          </a>`;
      })
      .join("");

    app.innerHTML = `
      ${storage === "demo" ? `<div class="heritage-notice">${escapeHtml(notice)}</div>` : ""}
      <div class="heritage-section-heading">
        <div><span>POSTS</span><h2>全部帖子</h2></div>
        <button class="heritage-refresh" type="button" title="${staticBase ? "刷新帖子目录" : "从 Box 重新读取"}">↻ 刷新</button>
      </div>
      ${cards ? `<div class="heritage-grid">${cards}</div>` : `
        <div class="heritage-state"><strong>这里还没有帖子</strong><p>${staticBase ? "新的学习笔记正在整理中。" : "向配置的 Box 目录上传 .md 或 .txt 文件后再刷新。"}</p></div>`}`;

    app.querySelector(".heritage-refresh")?.addEventListener("click", () => load(true));
  }

  async function load(forceRefresh) {
    app.setAttribute("aria-busy", "true");
    if (forceRefresh) {
      app.innerHTML = '<div class="heritage-loading" role="status"><span class="heritage-loading__dot"></span>正在刷新帖子目录……</div>';
    }
    try {
      const response = await fetch(staticBase ? staticBase.href : `${apiBase}/posts${forceRefresh ? "?refresh=true" : ""}`, {
        headers: { Accept: "application/json" },
        cache: forceRefresh ? "reload" : "default",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail || `服务器返回 ${response.status}`);
      if (selectedSlug) {
        const post = payload.posts.find((item) => item.slug === selectedSlug);
        if (!post) throw new Error("没有找到这篇帖子，它可能已被移动或删除。");
        await readerView(post, payload.notice, payload.storage);
      } else {
        cardsView(payload.posts, payload.notice, payload.storage);
      }
    } catch (error) {
      errorView(error instanceof Error ? error.message : String(error));
    } finally {
      app.removeAttribute("aria-busy");
    }
  }

  load(false);
})();
