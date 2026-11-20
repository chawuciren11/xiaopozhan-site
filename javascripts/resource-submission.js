(function () {
  "use strict";

  const categories = {
    基础能力: ["数学", "编程"],
    人工智能: ["机器学习", "导引", "系统", "深度学习", "LLM", "生成模型"],
  };

  document.querySelectorAll("[data-submission-back]").forEach(function (back) {
    back.addEventListener("click", function (event) {
      if (window.history.length <= 1) return;
      event.preventDefault();
      window.history.back();
    });
  });

  const form = document.getElementById("resource-submission-form");
  if (!form) return;

  const level2 = form.querySelector("[data-category-level2]");
  const level3 = form.querySelector("[data-category-level3]");
  const preview = document.querySelector("[data-submission-preview]");
  const previewPath = document.querySelector("[data-preview-path]");
  const previewDocument = document.querySelector("[data-preview-document]");
  const downloadButton = document.querySelector("[data-download-markdown]");
  let currentMarkdown = "";
  let currentCourseName = "课程投稿";

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function updateLevel3() {
    const options = categories[level2.value] || [];
    level3.innerHTML = options.length
      ? '<option value="" selected disabled>请选择</option>' + options.map(function (item) {
          return `<option value="${item}">${item}</option>`;
        }).join("")
      : '<option value="" selected>请先选择二级分类</option>';
    level3.disabled = options.length === 0;
  }

  function optionalResource(label, value) {
    return value ? `- ${label}：<${value}>` : `- ${label}：无`;
  }

  level2.addEventListener("change", updateLevel3);

  form.addEventListener("reset", function () {
    window.setTimeout(function () {
      updateLevel3();
      preview.hidden = true;
      currentMarkdown = "";
    }, 0);
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const data = Object.fromEntries(new FormData(form).entries());
    const stars = "🌟".repeat(Number(data.difficulty));
    const otherResources = String(data.otherResources || "")
      .split(/\r?\n/)
      .map(function (line) { return line.trim(); })
      .filter(Boolean);
    const otherMarkdown = otherResources.map(function (line) { return `- ${line}`; }).join("\n");

    currentCourseName = data.courseName;
    currentMarkdown = [
      `<!-- 分类：${data.categoryLevel1} / ${data.categoryLevel2} / ${data.categoryLevel3} -->`,
      "",
      `# ${data.courseName}`,
      "",
      "## 课程简介",
      "",
      `- 所属大学：${data.university}`,
      `- 先修要求：${data.prerequisites}`,
      `- 编程语言：${data.languages}`,
      `- 课程难度：${stars}`,
      `- 预计学时：${data.studyHours} 小时`,
      "",
      data.description,
      "",
      "## 课程资源",
      "",
      `- 课程网站：<${data.courseWebsite}>`,
      optionalResource("课程视频", data.courseVideo),
      optionalResource("课程教材", data.courseTextbook),
      optionalResource("课程作业", data.courseAssignments),
      optionalResource("课程代码", data.courseCode),
      otherMarkdown,
      "",
    ].filter(function (line, index, lines) {
      return line !== "" || index === 0 || lines[index - 1] !== "";
    }).join("\n");

    previewPath.textContent = `${data.categoryLevel1} / ${data.categoryLevel2} / ${data.categoryLevel3}`;
    previewDocument.innerHTML = `
      <h1>${escapeHtml(data.courseName)}</h1>
      <h2>课程简介</h2>
      <ul>
        <li>所属大学：${escapeHtml(data.university)}</li>
        <li>先修要求：${escapeHtml(data.prerequisites)}</li>
        <li>编程语言：${escapeHtml(data.languages)}</li>
        <li>课程难度：<span class="submission-preview__stars">${stars}</span></li>
        <li>预计学时：${escapeHtml(data.studyHours)} 小时</li>
      </ul>
      <p>${escapeHtml(data.description).replaceAll("\n", "<br>")}</p>
      <h2>课程资源</h2>
      <ul>
        <li>课程网站：<a href="${escapeHtml(data.courseWebsite)}" target="_blank" rel="noopener">${escapeHtml(data.courseWebsite)}</a></li>
        ${data.courseVideo ? `<li>课程视频：${escapeHtml(data.courseVideo)}</li>` : ""}
        ${data.courseTextbook ? `<li>课程教材：${escapeHtml(data.courseTextbook)}</li>` : ""}
        ${data.courseAssignments ? `<li>课程作业：${escapeHtml(data.courseAssignments)}</li>` : ""}
        ${data.courseCode ? `<li>课程代码：${escapeHtml(data.courseCode)}</li>` : ""}
        ${otherResources.map(function (line) { return `<li>${escapeHtml(line)}</li>`; }).join("")}
      </ul>`;
    preview.hidden = false;
    preview.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  downloadButton.addEventListener("click", function () {
    if (!currentMarkdown) return;
    const blob = new Blob([currentMarkdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${currentCourseName.replace(/[<>:\"/\\|?*\u0000-\u001f]/g, "-")}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });
})();
