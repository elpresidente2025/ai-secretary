'use strict';

// 프론트(userUtils)와 동일 컨셉의 표시용 직함
function getDisplayTitleFromProfile(p = {}) {
  const { position, regionMetro, regionLocal, status } = p || {};
  let base = '';

  if (position === '국회의원') base = '국회의원';
  else if (position === '광역의원') {
    if (!regionMetro) base = '광역의원';
    else if (String(regionMetro).endsWith('시')) base = '시의원';
    else if (String(regionMetro).endsWith('도')) base = '도의원';
    else base = '광역의원';
  } else if (position === '기초의원') {
    if (!regionLocal) base = '기초의원';
    else if (String(regionLocal).endsWith('시')) base = '시의원';
    else if (String(regionLocal).endsWith('구')) base = '구의원';
    else if (String(regionLocal).endsWith('군')) base = '군의원';
    else base = '기초의원';
  } else {
    base = position || '';
  }

  return status === '예비' && base ? `${base} 후보` : base;
}

module.exports = { getDisplayTitleFromProfile };
