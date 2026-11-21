(function () {
  "use strict";

  const page = document.querySelector(".note-submission-page");
  if (!page) return;
  const apiBase = (document.querySelector('meta[name="account-api-base"]')?.content || "").replace(/\/$/, "");
  const sessionKey = "xiaopozhan-account:" + (apiBase || location.origin);
  function sessionToken() { try { return sessionStorage.getItem(sessionKey) || ""; } catch (_) { return ""; } }

  const title = page.querySelector("[data-note-title]");
  const realName = page.querySelector("[data-note-real-name]");
  const nickname = page.querySelector("[data-note-nickname]");
  const studentId = page.querySelector("[data-note-student-id]");
  const body = page.querySelector("[data-note-body]");
  const syntax = page.querySelector("[data-note-syntax]");
  const referenceList = page.querySelector("[data-reference-list]");
  const addReferenceButton = page.querySelector("[data-add-reference]");
  const preview = page.querySelector("[data-note-preview]");
  const status = page.querySelector("[data-preview-status]");
  const publishButtons = Array.from(page.querySelectorAll("[data-publish-note]"));
  const publishStatuses = Array.from(page.querySelectorAll("[data-publish-status]"));
  let timer = null;
  let controller = null;

  function renumberReferences() {
    referenceList.querySelectorAll(".note-reference-row").forEach(function (row, index) {
      row.querySelector(".note-reference-number").textContent = `【${index + 1}】`;
      row.querySelector("input").setAttribute("aria-label", `网站引用 ${index + 1}`);
    });
  }

  function addReference(value, shouldFocus) {
    const row = document.createElement("div");
    row.className = "note-reference-row";
    row.innerHTML = `
      <span class="note-reference-number"></span>
      <input type="url" placeholder="https://…" value="">
      <button type="button" aria-label="删除这条引用" title="删除">×</button>`;
    const input = row.querySelector("input");
    input.value = value || "";
    input.addEventListener("input", schedulePreview);
    row.querySelector("button").addEventListener("click", function () {
      row.remove();
      if (!referenceList.children.length) addReference("", false);
      renumberReferences();
      schedulePreview();
    });
    referenceList.appendChild(row);
    renumberReferences();
    if (shouldFocus !== false) input.focus();
  }

  function getReferences() {
    return Array.from(referenceList.querySelectorAll("input"))
      .map(function (input) { return input.value.trim(); })
      .filter(function (value) { return value !== ""; });
  }

  function schedulePreview() {
    window.clearTimeout(timer);
    status.textContent = "等待同步";
    timer = window.setTimeout(updatePreview, 420);
  }

  async function updatePreview() {
    if (controller) controller.abort();
    controller = new AbortController();
    status.textContent = "正在渲染…";

    try {
      const response = await fetch(`${apiBase}/api/submissions/notes/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          title: title.value,
          nickname: nickname.value,
          body: body.value,
          references: getReferences(),
          syntax: syntax.value,
        }),
        signal: controller.signal,
      });
      const payload = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(payload.detail || `预览服务返回 ${response.status}`);
      preview.innerHTML = payload.html;
      status.textContent = "已同步";
    } catch (error) {
      if (error.name === "AbortError") return;
      status.textContent = "渲染失败";
      preview.innerHTML = '<div class="note-preview-error"><strong>暂时无法生成预览</strong><p></p></div>';
      preview.querySelector("p").textContent = String(error.message || error);
    }
  }

  function validateSubmission() {
    for (const field of [realName, nickname, studentId, title, body]) {
      if (!field.reportValidity()) return false;
    }
    for (const input of referenceList.querySelectorAll("input")) {
      if (input.value.trim() && !input.reportValidity()) return false;
    }
    return true;
  }

  function setPublishStatus(message, state) {
    publishStatuses.forEach(function (element) {
      element.textContent = message;
      element.dataset.state = state || "";
    });
  }

  async function publishNote() {
    const token = sessionToken();
    if (!token) { setPublishStatus("请先登录后再发布，正文可以继续编辑。", "error"); return; }
    if (!validateSubmission()) return;
    publishButtons.forEach(function (button) {
      button.disabled = true;
      button.textContent = "正在发布…";
    });
    setPublishStatus("正在保存投稿资料并上传正文，请勿关闭页面……", "pending");

    try {
      const response = await fetch(`${apiBase}/api/submissions/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          real_name: realName.value,
          nickname: nickname.value,
          student_id: studentId.value,
          title: title.value,
          body: body.value,
          references: getReferences(),
          syntax: syntax.value,
        }),
      });
      const payload = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(payload.detail || `发布服务返回 ${response.status}`);

      setPublishStatus("发布成功，正在打开笔记……", "success");
      const publishedUrl = new URL(`../../传承/?post=${encodeURIComponent(payload.slug)}`, window.location.href).href;
      publishButtons.forEach(function (button) {
        button.textContent = "已发布";
      });
      const link = document.createElement("a");
      link.className = "md-button note-published-link";
      link.href = publishedUrl;
      link.textContent = "查看已发布笔记";
      publishButtons[publishButtons.length - 1].insertAdjacentElement("afterend", link);
      window.setTimeout(function () {
        window.location.assign(publishedUrl);
      }, 650);
    } catch (error) {
      const message = `发布失败：${String(error.message || error)}`;
      setPublishStatus(message, "error");
      publishButtons.forEach(function (button) {
        button.disabled = false;
        button.textContent = "重新发布";
      });
      window.alert(message);
    }
  }

  addReferenceButton.addEventListener("click", function () { addReference("", true); });
  publishButtons.forEach(function (button) {
    button.addEventListener("click", publishNote);
  });
  [title, nickname, body, syntax].forEach(function (field) {
    field.addEventListener("input", schedulePreview);
    field.addEventListener("change", schedulePreview);
  });

  addReference("", false);
  nickname.readOnly = true;
  const token = sessionToken();
  if (token) {
    fetch(`${apiBase}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      .then(async (response) => { if (!response.ok) throw new Error("请重新登录后发布"); return response.json(); })
      .then((payload) => { nickname.value = payload.user.username; schedulePreview(); setPublishStatus("已登录，可以发布笔记。", ""); })
      .catch(() => setPublishStatus("登录已失效，请重新登录后发布。", "error"));
  } else { setPublishStatus("请先登录后再发布，正文可以继续编辑。", ""); }
  schedulePreview();
})();
