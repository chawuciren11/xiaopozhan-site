(function () {
  "use strict";
  const panel = document.querySelector("[data-account-panel]");
  const header = document.querySelector("[data-account-link]");
  const configuredBase = document.querySelector('meta[name="account-api-base"]')?.content || "";
  const staticSite = !!document.querySelector('meta[name="heritage-static-index"]');
  const apiBase = configuredBase.replace(/\/$/, "");
  const storageKey = "xiaopozhan-account:" + (apiBase || location.origin);
  let token = "";
  let registration = false;
  let busy = false;
  const status = panel?.querySelector("[data-account-status]");
  const form = panel?.querySelector("[data-account-form]");
  const session = panel?.querySelector("[data-account-session]");
  const confirmField = panel?.querySelector("[data-account-confirm]");
  const submit = panel?.querySelector("[data-account-submit]");
  const toggle = panel?.querySelector("[data-account-switch]");

  function say(message) { if (status) status.textContent = message; }
  function remember(value) {
    token = value;
    try { value ? sessionStorage.setItem(storageKey, value) : sessionStorage.removeItem(storageKey); }
    catch (_) { /* In-memory login still works if storage is disabled. */ }
  }
  try { token = sessionStorage.getItem(storageKey) || ""; } catch (_) {}

  async function request(path, method = "GET", body) {
    const response = await fetch(`${apiBase}/api/auth/${path}`, {
      method,
      credentials: "omit",
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(90000),
    });
    const payload = response.status === 204 ? {} : await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(typeof payload.detail === "string" ? payload.detail : "操作未完成，请稍后再试");
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function showUser(user) {
    if (header) header.textContent = user ? `账号 · ${user.username}` : "注册 / 登录";
    if (!panel) return;
    form.hidden = !!user;
    session.hidden = !user;
    if (user) panel.querySelector("[data-account-name]").textContent = user.username;
  }

  if (staticSite && !apiBase) {
    say("注册与登录服务尚未开放，欢迎先浏览公开内容。");
    return;
  }
  if (apiBase && !(apiBase.startsWith("https://") || (!staticSite && /^http:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(apiBase)))) {
    say("账号服务地址配置有误，请联系站点管理员。");
    return;
  }

  toggle?.addEventListener("click", () => {
    if (busy) return;
    registration = !registration;
    confirmField.hidden = !registration;
    form.elements.confirmation.disabled = !registration;
    form.elements.confirmation.required = registration;
    form.elements.password.autocomplete = registration ? "new-password" : "current-password";
    submit.textContent = registration ? "注册账号" : "登录";
    toggle.textContent = registration ? "已有账号？登录" : "没有账号？注册";
    say(registration ? "注册后将自动登录。请妥善保存密码，目前暂不支持找回密码。" : "请输入用户名和密码。");
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy || !form.reportValidity()) return;
    if (registration && form.elements.password.value !== form.elements.confirmation.value) {
      say("两次输入的密码不一致。"); return;
    }
    busy = true;
    submit.disabled = toggle.disabled = true;
    say(registration ? "正在创建账号……" : "正在登录……");
    try {
      const payload = await request(registration ? "register" : "login", "POST", {
        username: form.elements.username.value.trim(), password: form.elements.password.value,
      });
      remember(payload.token);
      form.reset();
      showUser(payload.user);
      say(registration ? "注册成功，已登录。" : "登录成功。");
    } catch (error) { say(error.message === "Failed to fetch" ? "无法连接账号服务，请稍后重试。" : error.message); }
    finally { busy = false; submit.disabled = toggle.disabled = false; }
  });

  panel?.querySelector("[data-account-logout]").addEventListener("click", async (event) => {
    event.target.disabled = true;
    try {
      await request("logout", "POST");
      remember(""); showUser(null); say("已退出登录。");
    } catch (_) { say("退出失败，请检查网络后重试。"); }
    finally { event.target.disabled = false; }
  });

  async function init() {
    try {
      if (panel) {
        say("正在连接账号服务，首次访问可能需要约一分钟……");
        const health = await request("status");
        if (!health.configured) { say("注册与登录服务尚未开放，欢迎先浏览公开内容。"); return; }
      }
      if (token) {
        const payload = await request("me");
        showUser(payload.user); say("已登录。");
      } else { showUser(null); say("请输入用户名和密码，或创建新账号。"); }
    } catch (error) {
      if (error.status === 401) {
        remember(""); showUser(null); say("登录已过期，请重新登录。");
      } else { say("暂时无法连接账号服务，请稍后刷新重试。"); }
    }
  }
  init();
})();
