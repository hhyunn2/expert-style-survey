(function () {
  const config = window.SURVEY_CONFIG || {};
  const storageKey = config.storageKey || "expert-style-survey-draft";
  const form = document.getElementById("surveyForm");
  const saveStatus = document.getElementById("saveStatus");
  const endpointNotice = document.getElementById("endpointNotice");
  const submitResult = document.getElementById("submitResult");
  const prevStepButton = document.getElementById("prevStep");
  const nextStepButton = document.getElementById("nextStep");
  const stepProgress = document.getElementById("stepProgress");
  const stepTitle = document.getElementById("stepTitle");
  const imageSrc = config.defaultImage || "assets/default-image.svg";
  let steps = [];
  let currentStepIndex = 0;

  const partBSources = [
    { key: "test4", fileBase: "test_4", label: "test4" },
    { key: "test7", fileBase: "test_7", label: "test7" },
    { key: "test9", fileBase: "test_9", label: "test9" },
    { key: "test11", fileBase: "test11", label: "test11" }
  ];

  const editTypes = [
    { key: "p22_12", code: "p22-12", label: "edit p22-12" },
    { key: "p23_16", code: "p23-16", label: "edit p23-16" },
    { key: "p4_19", code: "p4-19", label: "edit p4-19" },
    { key: "p9_10", code: "p9-10", label: "edit p9-10" },
    { key: "p9_2", code: "p9-2", label: "edit p9-2" }
  ];

  const pairs = partBSources.flatMap((source) => editTypes.map((edit) => {
    const pairNumber = partBSources.indexOf(source) * editTypes.length + editTypes.indexOf(edit) + 1;
    const id = `pair${String(pairNumber).padStart(2, "0")}`;
    const originalSrc = `assets/interview/${source.fileBase}.jpg`;
    return {
      id,
      label: `이미지 문항 ${pairNumber}`,
      source,
      edit,
      originalSrc,
      d095Src: `assets/interview/${source.fileBase}_${edit.code}_0_d0.95.jpg`,
      d100Src: `assets/interview/${source.fileBase}_${edit.code}_0_d1.00.jpg`
    };
  }));

  const triads = [
    { id: "triad01", label: "A/B/C 문항 1", source: "test_0", displaySource: "test0", editCode: "p9-2", cFile: "test0_C.jpg" },
    { id: "triad02", label: "A/B/C 문항 2", source: "test_1", displaySource: "test1", editCode: "p9-2", cFile: "test1_C.jpg" },
    { id: "triad03", label: "A/B/C 문항 3", source: "test_5", displaySource: "test5", editCode: "p9-10", cFile: "test_5_C.jpg" },
    { id: "triad04", label: "A/B/C 문항 4", source: "test_6", displaySource: "test6", editCode: "p9-10", cFile: "test_6_C.jpg" },
    { id: "triad05", label: "A/B/C 문항 5", source: "test_8", displaySource: "test8", editCode: "p22-12", cFile: "test_8_C.jpg" },
    { id: "triad06", label: "A/B/C 문항 6", source: "test_10", displaySource: "test10", editCode: "p22-12", cFile: "test_10_C.jpg" },
    { id: "triad07", label: "A/B/C 문항 7", source: "test12", displaySource: "test12", editCode: "p23-16", cFile: "test12_C.jpg" },
    { id: "triad08", label: "A/B/C 문항 8", source: "test13", displaySource: "test13", editCode: "p23-16", cFile: "test13_C.jpg" },
    { id: "triad09", label: "A/B/C 문항 9", source: "test_2", displaySource: "test2", editCode: "p4-19", cFile: "test_2_C.jpg" },
    { id: "triad10", label: "A/B/C 문항 10", source: "test_3", displaySource: "test3", editCode: "p4-19", cFile: "test_3_C.jpg" }
  ];

  const differenceTypes = [
    ["style", "스타일 차이"],
    ["content", "내용 차이"],
    ["quality", "품질 차이"],
    ["artifact", "생성 오류"],
    ["mixed", "여러 요소가 섞인 차이"]
  ];

  renderPairs();
  renderTriads();
  collectSteps();
  hydrateDefaults();
  restoreDraft();
  updateEndpointNotice();
  showStepFromHash();

  form.addEventListener("input", debounce(saveDraft, 280));
  form.addEventListener("change", saveDraft);
  form.addEventListener("submit", submitSurvey);
  prevStepButton.addEventListener("click", () => goToStep(currentStepIndex - 1));
  nextStepButton.addEventListener("click", () => goToStep(currentStepIndex + 1));
  window.addEventListener("hashchange", showStepFromHash);
  document.querySelectorAll("[data-go-step]").forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.getAttribute("data-go-step");
      const index = steps.findIndex((step) => step.id === targetId);
      if (index >= 0) goToStep(index);
    });
  });
  document.getElementById("downloadJson").addEventListener("click", () => {
    downloadPayload(buildPayload());
  });
  document.getElementById("clearDraft").addEventListener("click", clearDraft);

  function renderPairs() {
    const container = document.getElementById("pairsContainer");
    container.innerHTML = pairs.map((pair, index) => `
      <section class="section survey-step pair-card" id="${pair.id}" data-step-title="${pair.label}">
        <div class="pair-title">
          <h3>${pair.label}</h3>
          <span class="pair-badge">${index + 1} / ${pairs.length}</span>
        </div>
        <div class="pair-fields">
          ${renderEditComparisonFields(pair.id, "d095", pair.originalSrc, pair.d095Src)}
          ${renderEditComparisonFields(pair.id, "d100", pair.originalSrc, pair.d100Src)}
        </div>
      </section>
    `).join("");
  }

  function renderEditComparisonFields(pairId, strengthKey, imageASrc, imageBSrc) {
    return `
      <div class="comparison-block">
        <div class="image-pair">
          ${renderImageSlot(pairId, `${strengthKey}_A`, "이미지 A", imageASrc)}
          ${renderImageSlot(pairId, `${strengthKey}_B`, "이미지 B", imageBSrc)}
        </div>
        <fieldset class="field">
          <legend>1. 두 이미지는 스타일이 같다고 보시나요, 다르다고 보시나요?</legend>
          ${renderFivePointScale(`${pairId}_${strengthKey}_style_similarity`, ["매우 다름", "약간 다름", "애매함", "약간 같음", "매우 같음"])}
        </fieldset>
        <label class="field">
          <span>2. 그렇게 판단하신 가장 큰 이유는 무엇인가요?</span>
          <textarea name="${pairId}_${strengthKey}_judgment_reason" rows="4"></textarea>
        </label>
        <fieldset class="field">
          <legend>3. 두 이미지의 차이는 주로 무엇에 가깝나요?</legend>
          <div class="checkbox-cluster">
            ${differenceTypes.map(([value, text]) => `
              <label><input type="checkbox" name="${pairId}_${strengthKey}_difference_types" value="${value}"> ${text}</label>
            `).join("")}
          </div>
        </fieldset>
        <fieldset class="field">
          <legend>4. 이 이미지 쌍을 스타일 구분 기준 쌍으로 사용해도 적절하다고 보시나요?</legend>
          ${renderFivePointScale(`${pairId}_${strengthKey}_training_suitability`, ["부적절함", "다소 부적절함", "애매함", "다소 적절함", "매우 적절함"])}
        </fieldset>
      </div>
    `;
  }

  function renderTriads() {
    const container = document.getElementById("triadsContainer");
    container.innerHTML = triads.map((triad, index) => {
      const originalSrc = `assets/interview/${triad.source}.jpg`;
      const edit095Src = `assets/interview/${triad.source}_${triad.editCode}_0_d0.95.jpg`;
      const edit100Src = `assets/interview/${triad.source}_${triad.editCode}_0_d1.00.jpg`;
      const cSrc = `assets/interview/${triad.cFile}`;
      return `
      <section class="section survey-step triad-card" id="${triad.id}" data-step-title="${triad.label}">
        <div class="pair-title">
          <h3>${triad.label}</h3>
          <span class="pair-badge">${index + 1} / ${triads.length}</span>
        </div>
        <div class="pair-fields">
          ${renderTriadComparisonFields(triad.id, "d095", originalSrc, edit095Src, cSrc)}
          ${renderTriadComparisonFields(triad.id, "d100", originalSrc, edit100Src, cSrc)}
        </div>
      </section>
    `;
    }).join("");
  }

  function renderTriadComparisonFields(triadId, strengthKey, imageASrc, imageBSrc, imageCSrc) {
    return `
      <div class="comparison-block">
        <div class="triad-images">
          ${renderImageSlot(triadId, `${strengthKey}_A`, "이미지 A", imageASrc)}
          ${renderImageSlot(triadId, `${strengthKey}_B`, "이미지 B", imageBSrc)}
          ${renderImageSlot(triadId, `${strengthKey}_C`, "이미지 C", imageCSrc)}
        </div>
        <fieldset class="field">
          <legend>1. B보다 C가 A와 더 같은 스타일처럼 보이나요?</legend>
          <div class="scale">
            <label><input type="radio" name="${triadId}_${strengthKey}_c_more_style_similar" value="strongly_no"> 전혀 그렇지 않음</label>
            <label><input type="radio" name="${triadId}_${strengthKey}_c_more_style_similar" value="no"> 그렇지 않음</label>
            <label><input type="radio" name="${triadId}_${strengthKey}_c_more_style_similar" value="unclear"> 애매함</label>
            <label><input type="radio" name="${triadId}_${strengthKey}_c_more_style_similar" value="yes"> 그렇다</label>
            <label><input type="radio" name="${triadId}_${strengthKey}_c_more_style_similar" value="strongly_yes"> 매우 그렇다</label>
          </div>
        </fieldset>
        <label class="field">
          <span>2. 그렇게 판단하신 이유는 무엇인가요?</span>
          <textarea name="${triadId}_${strengthKey}_style_choice_reason" rows="4"></textarea>
        </label>
        <label class="field">
          <span>3. 캐릭터, 구도, 장면 내용이 비슷하거나 달라서 스타일 판단이 헷갈린 부분이 있었나요?</span>
          <textarea name="${triadId}_${strengthKey}_content_influence" rows="4"></textarea>
        </label>
      </div>
    `;
  }

  function renderImageSlot(questionId, imageKey, label, src = imageSrc) {
    return `
      <label class="image-slot">
        <span>${label || `이미지 ${imageKey}`}</span>
        <img src="${src}" alt="${questionId} ${label || imageKey}">
      </label>
    `;
  }

  function renderFivePointScale(name, labels) {
    return `
      <div class="scale">
        ${labels.map((label, index) => {
          const value = index + 1;
          return `<label><input type="radio" name="${name}" value="${value}"> ${value}. ${label}</label>`;
        }).join("")}
      </div>
    `;
  }

  function hydrateDefaults() {
    const dateInput = form.elements.interview_date;
    if (dateInput && !dateInput.value) {
      dateInput.value = new Date().toISOString().slice(0, 10);
    }
  }

  function collectSteps() {
    steps = Array.from(document.querySelectorAll(".survey-step"));
  }

  function showStepFromHash() {
    const id = window.location.hash.slice(1);
    const index = steps.findIndex((step) => step.id === id);
    goToStep(index >= 0 ? index : currentStepIndex, { updateHash: false });
  }

  function goToStep(index, options = {}) {
    if (!steps.length) return;
    const nextIndex = Math.max(0, Math.min(index, steps.length - 1));
    currentStepIndex = nextIndex;

    steps.forEach((step, stepIndex) => {
      step.classList.toggle("is-active", stepIndex === currentStepIndex);
    });

    prevStepButton.disabled = currentStepIndex === 0;
    nextStepButton.disabled = currentStepIndex === steps.length - 1;
    nextStepButton.textContent = currentStepIndex === steps.length - 1 ? "마지막 페이지" : "다음 →";
    stepProgress.textContent = `${currentStepIndex + 1} / ${steps.length}`;
    stepTitle.textContent = steps[currentStepIndex].dataset.stepTitle || steps[currentStepIndex].id;

    const activeNavTarget = getNavTarget(steps[currentStepIndex].id);
    document.querySelectorAll("[data-go-step]").forEach((button) => {
      button.classList.toggle("is-active", button.getAttribute("data-go-step") === activeNavTarget);
    });

    if (options.updateHash !== false) {
      history.replaceState(null, "", `#${steps[currentStepIndex].id}`);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function getNavTarget(stepId) {
    if (stepId.startsWith("pair")) return "part-b";
    if (stepId.startsWith("triad")) return "part-c";
    return stepId;
  }

  function serializeForm() {
    const grouped = {};
    Array.from(form.elements).forEach((element) => {
      if (!element.name || element.disabled || element.type === "submit" || element.type === "button") return;
      grouped[element.name] = grouped[element.name] || [];
      grouped[element.name].push(element);
    });

    return Object.fromEntries(Object.entries(grouped).map(([name, elements]) => {
      const first = elements[0];
      if (first.type === "checkbox") {
        if (elements.length === 1) return [name, first.checked];
        return [name, elements.filter((element) => element.checked).map((element) => element.value)];
      }
      if (first.type === "radio") {
        const checked = elements.find((element) => element.checked);
        return [name, checked ? checked.value : ""];
      }
      return [name, first.value];
    }));
  }

  function restoreForm(data) {
    Object.entries(data).forEach(([name, value]) => {
      const elements = form.elements[name];
      if (!elements) return;
      const group = elements.length === undefined ? [elements] : Array.from(elements);
      group.forEach((element) => {
        if (element.type === "checkbox") {
          element.checked = Array.isArray(value) ? value.includes(element.value) : Boolean(value);
          return;
        }
        if (element.type === "radio") {
          element.checked = element.value === value;
          return;
        }
        element.value = value || "";
      });
    });
  }

  function buildPayload() {
    return {
      survey: {
        title: "전문가 스타일 변형 편집 타당성 검증",
        version: "2026-05-03",
        githubUser: config.githubUser || "hhyunn2"
      },
      submission: {
        id: cryptoRandomId(),
        submittedAt: new Date().toISOString(),
        pageUrl: window.location.href,
        userAgent: navigator.userAgent
      },
      answers: serializeForm()
    };
  }

  function saveDraft() {
    localStorage.setItem(storageKey, JSON.stringify(serializeForm()));
    saveStatus.textContent = "임시 저장됨";
  }

  function restoreDraft() {
    const saved = localStorage.getItem(storageKey);
    if (!saved) {
      saveStatus.textContent = "작성 대기";
      return;
    }
    try {
      restoreForm(JSON.parse(saved));
      saveStatus.textContent = "임시 저장 복원";
    } catch (error) {
      console.warn("Draft restore failed", error);
      saveStatus.textContent = "작성 대기";
    }
  }

  function clearDraft() {
    localStorage.removeItem(storageKey);
    submitResult.hidden = false;
    submitResult.textContent = "이 브라우저에 저장된 임시 응답을 삭제했습니다.";
    saveStatus.textContent = "삭제됨";
  }

  async function submitSurvey(event) {
    event.preventDefault();
    submitResult.hidden = true;

    if (!form.reportValidity()) return;

    const payload = buildPayload();
    const endpoint = config.submitEndpoint || "";

    if (!endpoint) {
      submitResult.hidden = false;
      submitResult.textContent = "온라인 저장 엔드포인트가 아직 설정되지 않았습니다. JSON 백업 파일을 생성했습니다.";
      downloadPayload(payload);
      return;
    }

    saveStatus.textContent = "전송 중";
    setButtonsDisabled(true);

    try {
      const body = JSON.stringify(payload);
      if (config.noCors === false) {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        submitResult.hidden = false;
        submitResult.textContent = "응답이 저장되었습니다. 감사합니다.";
      } else {
        await fetch(endpoint, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body
        });
        submitResult.hidden = false;
        submitResult.textContent = "응답 전송 요청을 완료했습니다. 감사합니다.";
      }
      localStorage.removeItem(storageKey);
      saveStatus.textContent = "전송 완료";
      form.reset();
      hydrateDefaults();
    } catch (error) {
      submitResult.hidden = false;
      submitResult.textContent = `전송 중 문제가 발생했습니다. JSON 백업을 내려받아 보관해주세요.\n\n${error.message}`;
      downloadPayload(payload);
      saveStatus.textContent = "전송 실패";
    } finally {
      setButtonsDisabled(false);
    }
  }

  function updateEndpointNotice() {
    if (config.submitEndpoint) return;
    endpointNotice.hidden = false;
    endpointNotice.textContent = "온라인 저장 연결 전입니다. docs/config.js의 submitEndpoint에 Google Apps Script 웹 앱 URL을 넣으면 응답이 Google Sheets로 전송됩니다.";
  }

  function downloadPayload(payload) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const interviewId = payload.answers.interview_id || "no-id";
    link.href = url;
    link.download = `style-survey-${interviewId}-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function setButtonsDisabled(disabled) {
    form.querySelectorAll("button").forEach((button) => {
      button.disabled = disabled;
    });
  }

  function debounce(fn, delay) {
    let timeout;
    return function (...args) {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function cryptoRandomId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return `submission-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
