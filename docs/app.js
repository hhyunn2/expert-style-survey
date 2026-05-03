(function () {
  const config = window.SURVEY_CONFIG || {};
  const storageKey = config.storageKey || "expert-style-survey-draft";
  const form = document.getElementById("surveyForm");
  const saveStatus = document.getElementById("saveStatus");
  const endpointNotice = document.getElementById("endpointNotice");
  const submitResult = document.getElementById("submitResult");
  const imageSrc = config.defaultImage || "assets/default-image.svg";

  const pairs = [
    ["pair01", "이미지 쌍 1", "같은 목표 스타일 내부의 자연스러운 변화"],
    ["pair02", "이미지 쌍 2", "색감/팔레트(Palette) 변형"],
    ["pair03", "이미지 쌍 3", "선/외곽선 처리(Edge/Contour) 변형"],
    ["pair04", "이미지 쌍 4", "조명/명암(Lighting/Shading) 변형"],
    ["pair05", "이미지 쌍 5", "질감/재질(Surface/Material) 변형"],
    ["pair06", "이미지 쌍 6", "형태/비율(Form/Proportion) 변형"],
    ["pair07", "이미지 쌍 7", "스타일 이웃의 어려운 음성 예시"],
    ["pair08", "이미지 쌍 8", "품질/생성 오류 혼동 예시"]
  ];

  const candidates = [
    ["composition_framing", "화면 구성/프레이밍", "composition/framing"],
    ["camera_perspective", "카메라/원근/렌즈감", "camera/perspective"],
    ["detail_density", "디테일 밀도", "detail density"],
    ["shape_language", "형태 언어", "shape language"],
    ["value_design", "명도 구조", "value design"],
    ["brushwork_stroke", "붓질/스트로크", "brushwork/stroke"],
    ["rendering_abstraction", "사실성-단순화 정도", "rendering abstraction level"],
    ["post_processing", "후보정 효과", "post-processing"],
    ["gesture_pose_language", "동세/포즈 언어", "gesture/pose language"],
    ["facial_feature_design", "얼굴 요소 디자인", "facial feature design"],
    ["manga_grammar", "만화 문법", "manga-specific grammar"],
    ["three_d_rendering_grammar", "3D 렌더링 문법", "3D rendering grammar"]
  ];

  const differenceTypes = [
    ["style", "스타일 차이"],
    ["content", "내용 차이"],
    ["quality", "품질 차이"],
    ["artifact", "생성 오류"],
    ["mixed", "여러 요소가 섞인 차이"]
  ];

  renderPairs();
  renderCandidates();
  renderIssueRows();
  hydrateDefaults();
  restoreDraft();
  updateEndpointNotice();

  form.addEventListener("input", debounce(saveDraft, 280));
  form.addEventListener("change", saveDraft);
  form.addEventListener("submit", submitSurvey);
  document.getElementById("downloadJson").addEventListener("click", () => {
    downloadPayload(buildPayload());
  });
  document.getElementById("clearDraft").addEventListener("click", clearDraft);

  function renderPairs() {
    const container = document.getElementById("pairsContainer");
    container.innerHTML = pairs.map(([id, label, type], index) => `
      <article class="pair-card">
        <input type="hidden" name="${id}_prepared_type" value="${escapeHtml(type)}">
        <div class="pair-title">
          <h3>${label}</h3>
          <span class="pair-badge">${index < 6 ? "필수" : "예비"}</span>
        </div>
        <div class="image-pair">
          ${renderImageSlot(id, "A")}
          ${renderImageSlot(id, "B")}
        </div>
        <div class="pair-fields">
          <fieldset class="field">
            <legend>1. 두 이미지는 스타일이 같다고 보시나요, 다르다고 보시나요?</legend>
            ${renderFivePointScale(`${id}_style_similarity`, ["매우 다름", "약간 다름", "애매함", "약간 같음", "매우 같음"])}
          </fieldset>
          <label class="field">
            <span>2. 그렇게 판단하신 가장 큰 이유는 무엇인가요?</span>
            <textarea name="${id}_judgment_reason" rows="4"></textarea>
          </label>
          <fieldset class="field">
            <legend>3. 두 이미지의 차이는 주로 무엇에 가깝나요?</legend>
            <div class="checkbox-cluster">
              ${differenceTypes.map(([value, text]) => `
                <label><input type="checkbox" name="${id}_difference_types" value="${value}"> ${text}</label>
              `).join("")}
            </div>
          </fieldset>
          <fieldset class="field">
            <legend>4. 이 이미지 쌍을 스타일 평가 지표 학습에 사용해도 적절하다고 보시나요?</legend>
            ${renderFivePointScale(`${id}_training_suitability`, ["부적절함", "다소 부적절함", "애매함", "다소 적절함", "매우 적절함"])}
          </fieldset>
          <label class="field">
            <span>5. 모델이 잘못 배울 수 있는 지름길 학습(shortcut)이 있다면 무엇인가요?</span>
            <textarea name="${id}_shortcut_risk" rows="4"></textarea>
          </label>
        </div>
      </article>
    `).join("");
  }

  function renderImageSlot(pairId, side) {
    const lower = side.toLowerCase();
    return `
      <label class="image-slot">
        <span>이미지 ${side}</span>
        <img src="${imageSrc}" alt="${pairId} 이미지 ${side} 임시 자리">
        <input type="hidden" name="${pairId}_image_${lower}_src" value="${imageSrc}">
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

  function renderCandidates() {
    const container = document.getElementById("candidateAxes");
    container.innerHTML = candidates.map(([id, label, english]) => `
      <div class="candidate-row">
        <div class="candidate-name">
          ${label}
          <small>${english}</small>
        </div>
        <fieldset>
          <legend>추가 필요성</legend>
          <div class="compact-scale">
            <label><input type="radio" name="q10_${id}_need" value="low"> 낮음</label>
            <label><input type="radio" name="q10_${id}_need" value="medium"> 중간</label>
            <label><input type="radio" name="q10_${id}_need" value="high"> 높음</label>
          </div>
        </fieldset>
        <label class="field">
          <span>이유</span>
          <input type="text" name="q10_${id}_reason">
        </label>
      </div>
    `).join("");
  }

  function renderIssueRows() {
    const container = document.getElementById("issueRows");
    container.innerHTML = [1, 2, 3].map((row) => `
      <div class="issue-row">
        <label class="field">
          <span>이미지 쌍 번호</span>
          <select name="q13_issue_${row}_pair">
            <option value="">선택</option>
            ${pairs.map(([, label], index) => `<option value="${index + 1}">${label}</option>`).join("")}
          </select>
        </label>
        <fieldset>
          <legend>문제 유형</legend>
          <div class="checkbox-cluster">
            <label><input type="checkbox" name="q13_issue_${row}_types" value="content"> 내용</label>
            <label><input type="checkbox" name="q13_issue_${row}_types" value="quality"> 품질</label>
            <label><input type="checkbox" name="q13_issue_${row}_types" value="artifact"> 생성 오류</label>
            <label><input type="checkbox" name="q13_issue_${row}_types" value="other"> 기타</label>
          </div>
        </fieldset>
        <label class="field">
          <span>스타일 판단에 미친 영향</span>
          <textarea name="q13_issue_${row}_impact" rows="3"></textarea>
        </label>
      </div>
    `).join("");
  }

  function hydrateDefaults() {
    const dateInput = form.elements.interview_date;
    if (dateInput && !dateInput.value) {
      dateInput.value = new Date().toISOString().slice(0, 10);
    }
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
