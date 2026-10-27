// app.js – 화면 동작 (목록 그리기, 일정 추가)

// 04 단원 : Supabase wx_tasks 에서 일정 목록을 읽고 저장함
let tasks = [];
let weatherByRegion = {};   // 03 단원에서 지역별 날씨를 넣음

// Supabase 클라이언트 초기화 (비밀 키 절대 금지, config.js의 공개 anon 키만 사용)
const supabaseClient = (typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined' && window.supabase)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

async function loadTasks() {
  const msgBox = document.getElementById('msgBox');
  if (!supabaseClient || SUPABASE_URL.includes('YOUR_PROJECT_ID')) {
    if (msgBox) {
      msgBox.textContent = 'config.js에 Supabase 주소와 공개용 키를 입력해 주세요.';
    }
    tasks = [];
    renderTasks();
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from('wx_tasks')
      .select('id, title, region, kind, owner, created_at')
      .order('id', { ascending: true });

    if (error) throw error;
    tasks = data || [];
    if (msgBox && msgBox.textContent.includes('config.js')) {
      msgBox.textContent = '';
    }
  } catch (err) {
    console.warn('Supabase wx_tasks 읽기 실패:', err);
    tasks = [];
    if (msgBox) {
      msgBox.textContent = '일정 목록을 불러오지 못했습니다. (' + (err.message || '네트워크 오류') + ')';
    }
  }

  renderTasks();
}

function weatherText(w) {
  return w ? w.tempMax + '℃ · ' + w.windMax + 'm/s · ' + w.rainProb + '%' : '-';
}

function renderTasks() {
  const body = document.getElementById('taskList');
  body.innerHTML = '';
  if (tasks.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 7;
    td.style.textAlign = 'center';
    td.style.color = '#c62828';
    td.textContent = (!supabaseClient || SUPABASE_URL.includes('YOUR_PROJECT_ID'))
      ? 'config.js에 Supabase 접속 정보를 입력해 주세요'
      : '등록된 일정이 없습니다';
    tr.appendChild(td);
    body.appendChild(tr);
    return;
  }
  for (const t of tasks) {
    const w = weatherByRegion[t.region];
    const r = judge(t.kind, w);
    const tr = document.createElement('tr');
    for (const v of [t.title, t.region, t.kind, t.owner, weatherText(w)]) {
      const td = document.createElement('td');
      td.textContent = v;
      tr.appendChild(td);
    }
    const td = document.createElement('td');
    td.textContent = r.text;
    td.className = r.level;
    tr.appendChild(td);

    const tdAction = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.textContent = '삭제';
    delBtn.className = 'btn-del';
    delBtn.type = 'button';
    delBtn.addEventListener('click', () => deleteTask(t.id, t.title));
    tdAction.appendChild(delBtn);
    tr.appendChild(tdAction);

    body.appendChild(tr);
  }
}

async function deleteTask(id, title) {
  if (!confirm(`'${title}' 일정을 삭제하시겠습니까?`)) {
    return;
  }

  const msgBox = document.getElementById('msgBox');
  if (!supabaseClient || SUPABASE_URL.includes('YOUR_PROJECT_ID')) {
    if (msgBox) {
      msgBox.textContent = 'config.js에 Supabase 주소와 공개용 키를 입력해 주세요.';
    }
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from('wx_tasks')
      .delete()
      .eq('id', id)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      if (msgBox) {
        msgBox.textContent = '일정을 삭제하지 못했습니다. (Supabase RLS 삭제 정책을 확인해 주세요)';
      }
      return;
    }

    if (msgBox) msgBox.textContent = '';
    await loadTasks();
  } catch (err) {
    console.error('일정 삭제 실패:', err);
    if (msgBox) {
      msgBox.textContent = '일정 삭제 실패: ' + (err.message || '오류 발생');
    }
  }
}

async function addTask(e) {
  e.preventDefault();
  const t = {
    title: document.getElementById('titleInput').value.trim(),
    region: document.getElementById('regionInput').value,
    kind: document.getElementById('kindInput').value,
    owner: document.getElementById('ownerInput').value.trim(),
  };
  if (!t.title || !t.owner) return;

  const msgBox = document.getElementById('msgBox');
  if (!supabaseClient || SUPABASE_URL.includes('YOUR_PROJECT_ID')) {
    if (msgBox) {
      msgBox.textContent = 'config.js에 Supabase 주소와 공개용 키를 입력해 주세요.';
    }
    return;
  }

  try {
    const { error } = await supabaseClient
      .from('wx_tasks')
      .insert([t]);
    if (error) throw error;
    e.target.reset();
    if (msgBox) msgBox.textContent = '';
    await loadTasks();
  } catch (err) {
    console.error('일정 추가 실패:', err);
    if (msgBox) {
      msgBox.textContent = '일정 추가 실패: ' + (err.message || '오류 발생');
    }
  }
}

function getTodayString() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function renderTodayDate() {
  const el = document.getElementById('currentDate');
  if (el) {
    el.textContent = getTodayString();
  }
}

function downloadMarkdownReport() {
  const dateStr = getTodayString();
  const mdContent = buildMarkdownReport(tasks, weatherByRegion, dateStr);
  const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `현장일정_판단_${dateStr}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const isTestWind = new URLSearchParams(window.location.search).get('test') === 'wind';

async function loadWeather() {
  const weatherBox = document.getElementById('weatherBox');
  if (weatherBox) {
    weatherBox.textContent = '날씨 정보를 불러오는 중...';
  }

  const regionNames = Object.keys(COORDINATES);
  try {
    const requests = regionNames.map(async (name) => {
      const coords = COORDINATES[name];
      const url = buildWeatherUrl(coords.lat, coords.lon);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const parsed = parseWeatherData(data, isTestWind);
      if (parsed) {
        weatherByRegion[name] = parsed;
      }
    });

    await Promise.all(requests);

    if (weatherBox) {
      weatherBox.textContent = isTestWind
        ? '오늘 날씨 정보가 업데이트되었습니다. (시험 모드: 풍속 12m/s 적용)'
        : '오늘 지역별 날씨 정보가 업데이트되었습니다.';
    }
  } catch (err) {
    console.warn('날씨 정보를 불러오는 중 오류 발생:', err);
    if (weatherBox) {
      weatherBox.textContent = '날씨 정보를 불러오지 못했습니다. (오프라인/대기 모드)';
    }
  } finally {
    renderTasks();
  }
}

document.getElementById('taskForm').addEventListener('submit', addTask);
const downloadBtn = document.getElementById('downloadMdBtn');
if (downloadBtn) {
  downloadBtn.addEventListener('click', downloadMarkdownReport);
}
renderTodayDate();
loadTasks();
loadWeather();
