// logic.js – 판단 규칙 및 API 가공 (화면을 다루는 코드 금지)

// 교육용 가상 기준 (실제 작업 중지 · 행사 취소 기준은 각 기관 규정을 따름)
const RULES = { wind: 10, rain: 60, heat: 33 };

// 4개 지역 위·경도 좌표
const COORDINATES = {
  '세종': { lat: 36.48, lon: 127.29 },
  '대전': { lat: 36.35, lon: 127.38 },
  '태안': { lat: 36.75, lon: 126.30 },
  '보령': { lat: 36.33, lon: 126.61 },
};

// Open-Meteo 날씨 API URL 생성 (키 없음, m/s 단위)
function buildWeatherUrl(lat, lon) {
  return `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,wind_speed_10m_max,precipitation_probability_max&wind_speed_unit=ms&timezone=Asia%2FSeoul&forecast_days=1`;
}

// API 응답 데이터 해석 (테스트 모드일 경우 풍속 12m/s 강제 지정)
function parseWeatherData(data, isTestWind = false) {
  if (!data || !data.daily) return null;
  const tempMax = Math.round(data.daily.temperature_2m_max[0]);
  let windMax = Math.round(data.daily.wind_speed_10m_max[0] * 10) / 10;
  const rainProb = data.daily.precipitation_probability_max[0];

  if (isTestWind) {
    windMax = 12;
  }

  return { tempMax, windMax, rainProb };
}

// 일정 구분과 날씨로 판단 (w가 없으면 '날씨 확인 전')
function judge(kind, w) {
  if (!w) return { level: 'none', text: '날씨 확인 전' };
  if (kind === '실내') return { level: 'ok', text: '영향 없음' };
  if (kind === '고소' && w.windMax >= RULES.wind) return { level: 'stop', text: '중지 검토' };
  if (w.tempMax >= RULES.heat) return { level: 'warn', text: '폭염 휴식' };
  if (w.rainProb >= RULES.rain) return { level: 'warn', text: '우천 주의' };
  return { level: 'ok', text: '진행' };
}

// 마크다운 표 및 보고서 문자열 생성 (DOM 의존성 없는 순수 함수)
function buildMarkdownReport(tasks, weatherByRegion, dateStr) {
  const lines = [];
  if (dateStr) {
    lines.push(`# 현장 일정 날씨 판단 (${dateStr})\n`);
  }
  lines.push('| 일정 | 지역 | 구분 | 담당 | 날씨 | 판단 |');
  lines.push('|---|---|---|---|---|---|');

  if (!tasks || tasks.length === 0) {
    lines.push('| (등록된 일정이 없습니다) | - | - | - | - | - |');
  } else {
    for (const t of tasks) {
      const w = weatherByRegion ? weatherByRegion[t.region] : null;
      const weatherDesc = w ? `${w.tempMax}℃ · ${w.windMax}m/s · ${w.rainProb}%` : '-';
      const r = judge(t.kind, w);
      lines.push(`| ${t.title} | ${t.region} | ${t.kind} | ${t.owner} | ${weatherDesc} | ${r.text} |`);
    }
  }

  lines.push('');
  lines.push(`판단 기준: 풍속 ${RULES.wind}m/s 이상(고소 작업 중지 검토) · 강수확률 ${RULES.rain}% 이상(우천 주의) · 최고기온 ${RULES.heat}℃ 이상(폭염 휴식) (실내 일정 영향 없음)`);

  return lines.join('\n');
}

if (typeof module !== 'undefined') {
  module.exports = { RULES, COORDINATES, buildWeatherUrl, parseWeatherData, judge, buildMarkdownReport };
}
