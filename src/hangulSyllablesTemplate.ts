import { Glyph } from "../models/glyph";
import Project from "../models/project";

const choseongs = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const jungseongs = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ";
const jongseongs = " ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ";

const isCho = (source: number, target: string) => {
  return Array.from(target).some((glyph: string) => {
    return choseongs.indexOf(glyph) == source;
  });
}
const isJung = (source: number, target: string) => {
  return Array.from(target).some((glyph: string) => {
    return jungseongs.indexOf(glyph) == source;
  });
}
const isJong = (source: number, target: string) => {
  return Array.from(target).some((glyph: string) => {
    return jongseongs.indexOf(glyph) == source;
  });
}

const setComponents = (project: Project, r: number, c: number, ptr: number, templateID: string, type: "choseong" | "jungseong" | "jongseong") => {
  let components:  Array<Array<number>> = [];
  let s = "";
  if (type === "choseong") s = choseongs;
  else if (type == "jungseong") s = jungseongs;
  else if (type == "jongseong") s = jongseongs;

  for (let i = 0; i < r; i++) {
    components.push([]);
    for (let j = 0; j < c; j++) {
      let g = new Glyph();
      g.name = `${templateID} | ${type} | ${i+1} | ${s.charAt(j)}`;

      project.glyphs.set(ptr, g);
      components[i].push(ptr);
      ptr++;
    }
  }

  return components;
}

type HangulTemplateRule = (cho: number, jung: number, jong: number) => [tCho: number, tJung: number, tJong: number];
type HangulTemplateTooltip = {choseong: string[], jungseong: string[], jongseong: string[]}
export class HangulTemplate {
  templateName: string;
  nCho: number;
  nJung: number;
  nJong: number;
  rule: HangulTemplateRule;
  tooltip: HangulTemplateTooltip;

  constructor(templateName: string, nCho: number, nJung: number, nJong: number, rule: HangulTemplateRule, tooltip: HangulTemplateTooltip) {
    this.templateName = templateName;
    this.nCho = nCho; 
    this.nJung = nJung;
    this.nJong = nJong;
    this.rule = rule;
    this.tooltip = tooltip;
  }

  apply(project: Project, ptr: number) {
    let choComponents = setComponents(project, this.nCho, 19, ptr, this.templateName, "choseong");
    ptr += this.nCho*19;
    let jungComponents = setComponents(project, this.nJung, 21, ptr, this.templateName, "jungseong");
    ptr += this.nJung*21;
    let jongComponents = setComponents(project, this.nJong, 28, ptr, this.templateName, "jongseong");
    ptr += this.nJong*28;

    for (let cho = 0; cho < 19; cho++) {
      for (let jung = 0; jung < 21; jung++) {
        for (let jong = 0; jong < 28; jong++) {
          let u = cho*21*28 + jung*28 + jong + 0xAC00;
          let [tCho, tJung, tJong] = this.rule(cho, jung, jong);
          let g = project.getGlyph(u);
          g.addComponent(choComponents[tCho][cho]);
          g.addComponent(jungComponents[tJung][jung]);
          if (jong > 0) g.addComponent(jongComponents[tJong][jong]);
          project.setGlyph(u, g);
        }
      }
    }
  }
}

const hangulTemplatePokePT = new HangulTemplate("POKE_PT", 20, 13, 7, (cho, jung, jong) => {
  //       0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7
  // 초성: ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ (19개)
  // 중성: ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ (21개)
  // 종성:   ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ (28개)

  //                 ㅏ ㅐ ㅑ ㅒ ㅓ ㅔ ㅕ ㅖ ㅗ ㅘ ㅙ ㅚ ㅛ ㅜ ㅝ ㅞ ㅟ ㅠ ㅡ ㅢ ㅣ
  const choTypes  = [0, 1, 0, 1, 0, 1, 0, 1, 2, 5, 6, 5, 2, 4, 7, 8, 7, 4, 3, 9, 0];
  const jongTypes = [0, 1, 0, 1, 0, 1, 0, 1, 2, 1, 1, 1, 2, 4, 1, 1, 0, 4, 4, 1, 0];

  const choType = (cho: number, jung: number, jong: number) => {
    if (isJong(jong," ")) { /* 받침없음 */
      /* ㅓㅕ */
      if (isCho(cho,"ㄹ") && isJung(jung,"ㅓ")) { return 1; } // 러
      if (isJung(jung,"ㅓㅕ")) { return 0; } // 받침없는 ㅓㅕ

      /* ㅔ */
      if (isCho(cho,"ㅌ") && isJung(jung,"ㅔ")) { return 14; } // 테

      /* 예외처리 끝 */
      return choTypes[jung];
    }
    else { /* 받침있음 */
      /* ㅓㅕ */
      if (isJung(jung,"ㅓㅕ")) { return 11; } // 받침있는 ㅓㅕ

      /* ㄷ */
      if (isCho(cho,"ㄷ")) {
        if (isJung(jung,"ㅘ") && isJong(jong,"ㄴㅅ")) { return 7; } // 돤돳
        if (isJung(jung,"ㅗ") && isJong(jong,"ㅌ")) { return 14; } // 돝
      }

      /* ㅗㅛ */
      if (isJung(jung,"ㅜㅠ")) { return 3 + 10; } // +11대신 10을 사용

      /* 예외처리 끝 */
      return 10 + choTypes[jung];
    }
  }

  const jungType = (cho: number, jung: number, jong: number) => {
    if (jong == 0) { // 받침없음
      if (cho == 16 && jung == 5) { return 0; } // 테
      if (jung == 13 && (cho == 3 || cho == 17)) { return 1; } // 두푸
      if (cho == 18 && jung == 8) { return 2; } // 호
      //      ㄱ ㄲ ㄴ ㄷ ㄸ ㄹ ㅁ ㅂ ㅃ ㅅ ㅆ ㅇ ㅈ ㅉ ㅊ ㅋ ㅌ ㅍ ㅎ
      return [0, 2, 2, 2, 1, 1, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 1, 2, 1][cho];
    }

    if (cho == 6 && jung == 9) { // 뫅-뫟
      return 11;
    }
    if ((cho == 5 || cho == 7 || cho == 10 || cho == 11) && jung == 10) { // 뢕-뢯, 봭-뵇, 쐑-쐫, 왝-왷
      return 11;
    }
    if ((cho == 5 || cho == 6 || (cho == 7 && jong != 4 && jong != 19) || cho == 10 || cho == 11 || cho >= 14) && jung == 14) { // 뤅-뤟 뭑-뭫, 붝붞붣-붤,붱-붷, 쒁-쒛, 웍-웧, 춱-췋, 쿽-퀗, 퉉-퉣, 풕-풯, 훡-훻
      return 11;
    }
    if ((cho == 2 || cho == 5 || cho == 6 || cho == 7 || cho == 11) && jung == 11) { // 뇍-뇧, 뢱-룋, 뫽-묗, 뵉-뵣, 왹-욓
      return 11;
    }
    if (cho == 3 && (jong == 8 || jong == 7) && jung == 11) { // 될 or 됩
      return 11;
    }
    if (cho == 18 && jung == 19) { // 흭-힇
      return 11;
    }

    if (jong == 4 || jong == 19) { // ㄴ ㅅ 받침
      //      ㄱ ㄲ ㄴ ㄷ ㄸ ㄹ ㅁ ㅂ ㅃ ㅅ ㅆ ㅇ ㅈ ㅉ ㅊ ㅋ ㅌ ㅍ ㅎ
      return [3, 4, 7, 5, 5, 7, 7, 7, 7, 6, 6, 7, 7, 6, 7, 4, 7, 5, 7][cho];
    }
    else { // 그 외 받침
      if (jung == 8 || jung == 11 || jung == 12 || jung == 13 || jung == 17 || jung == 18) { // ㅗ ㅚ ㅛ ㅡ ㅜ ㅠ를 종성과 초성에 따라 분리
        if (cho == 11 && jung == 18) {
          // 으+ㅁㅇㅈㅍ 예외처리
          if (jong == 16 || jong == 21 || jong == 22 || jong == 26) { return 9; }
        }

        let j = 10;
        if (jung == 8) { // ㅗ에서 높은종성
          if (cho == 3 && jong == 25) { // 돝
            return 9;
          }
        }
        if (jung == 13 || jung == 17 || jung == 18) { // ㅜ ㅠ ㅡ에서 높은종성결합 탐색
          //      ㄱ ㄲ ㄳ ㄴ ㄵ ㄶ ㄷ ㄹ ㄺ ㄻ ㄼ ㄽ ㄾ ㄿ ㅀ ㅁ ㅂ ㅄ ㅅ ㅆ ㅇ ㅈ ㅊ ㅋ ㅌ ㅍ ㅎ
          j = [0,10, 9, 9,10, 9, 9,10, 9, 9, 9, 9, 9, 9, 9, 9,10, 9, 9,10, 9,10,10, 9, 9, 9,10, 9][jong]; // jongTypes
        }
        
        //      ㄱ ㄲ ㄴ ㄷ ㄸ ㄹ ㅁ ㅂ ㅃ ㅅ ㅆ ㅇ ㅈ ㅉ ㅊ ㅋ ㅌ ㅍ ㅎ
        return [8, 8, j, j, j, j, j, j, j, 9, 9, j, j, 9, j, 8, j, j, j][cho];
      }
      else { return 12; }
    }
  }

  const jongType = (cho: number, jung: number, jong: number) => {
     if (isCho(cho,"ㄷ") && isJung(jung,"ㅞㅟ") && isJong(jong, "ㅌ")) { return 5; } // 뒡뒽

    if (jongTypes[jung] == 2) { // ㅗ ㅛ를 초성에 따라 분리
      //      ㄱ ㄲ ㄴ ㄷ ㄸ ㄹ ㅁ ㅂ ㅃ ㅅ ㅆ ㅇ ㅈ ㅉ ㅊ ㅋ ㅌ ㅍ ㅎ
      return [2, 2, 3, 3, 3, 3, 3, 3, 3, 2, 2, 3, 3, 2, 3, 2, 3, 3, 3][cho];
    }
    else if (jongTypes[jung] == 4) { // ㅜ ㅠ ㅡ를 초성과 종성에 따라 분리
      if (cho == 11 && jung == 18) {
        // 으+ㅁㅇㅈㅍ 예외처리
        if (jong == 16 || jong == 21 || jong == 22 || jong == 26) { return 4; }
      }

      //       ㄱ ㄲ ㄴ ㄷ ㄸ ㄹ ㅁ ㅂ ㅃ ㅅ ㅆ ㅇ ㅈ ㅉ ㅊ ㅋ ㅌ ㅍ ㅎ
      let c = [4, 4, 5, 5, 5, 5, 5, 5, 5, 4, 4, 5, 5, 4, 5, 4, 5, 5, 5][cho]; // choTypes

      //         ㄱ ㄲ ㄳ ㄴ ㄵ ㄶ ㄷ ㄹ ㄺ ㄻ ㄼ ㄽ ㄾ ㄿ ㅀ ㅁ ㅂ ㅄ ㅅ ㅆ ㅇ ㅈ ㅊ ㅋ ㅌ ㅍ ㅎ
      return [0, c, 4, 4, c, 4, 4, c, 4, 4, 4, 4, 4, 4, 4, 4, c, 4, 4, c, 4, c, c, 4, 4, 4, c, 4][jong];
    }
    return jongTypes[jung];
  }

  return [
    choType(cho, jung, jong),
    jungType(cho, jung, jong),
    jongType(cho, jung, jong),
  ]
}, {
  choseong: [
    "받침 없는 [ㅏ ㅑ ㅣ ㅓ ㅕ]",
    "받침 없는 [ㅐ ㅒ ㅔ ㅖ], 러",
    "받침 없는 [ㅗ ㅛ]",
    "받침 없는 [ㅡ]",
    "받침 없는 [ㅜ ㅠ]",
    "받침 없는 [ㅘ ㅚ]",
    "받침 없는 [ㅙ]",
    "받침 없는 [ㅝ ㅟ]",
    "받침 없는 [ㅞ]",
    "받침 없는 [ㅢ]",

    "받침 있는 [ㅏ ㅑ ㅣ]",
    "받침 있는 [ㅐ ㅒ ㅓ ㅔ ㅕ ㅖ]",
    "받침 있는 [ㅗ ㅛ]",
    "받침 있는 [ㅜㅠㅡ]",
    "[ㅗㅚㅜㅠㅡ]와 높은받침 결합 낮은초성, 테",
    "받침 있는 [ㅘ ㅚ]",
    "받침 있는 [ㅙ],",
    "받침 있는 [ㅝ ㅟ]",
    "받침 있는 [ㅞ]",
    "받침 있는 [ㅢ]"
  ],
  jungseong: [
    "받침 없는 초성 [ㄱ] 결합, 테", // 짧은ㅖ
    "받침 없는 초성 [ㄸ ㄹ ㅆ ㅌ ㅎ] 결합, 두푸",
    "그 외 받침 없음, 호", // 긴ㅕ
    "받침 [ㄴ ㅅ]과 초성 [ㄱ] 결합", // 낮은ㅓ 높은ㅗ
    "받침 [ㄴ ㅅ]과 초성 [ㄲ ㅋ] 결합", // 안뭐더라 높은 ㅗ
    "받침 [ㄴ ㅅ]과 초성 [ㄷ ㄸ ㅍ] 결합", // 뭐더라 
    "받침 [ㄴ ㅅ]과 초성 [ㅅ ㅆ ㅉ] 결합", // 뭐더라 높은 ㅗ
    "받침 [ㄴ ㅅ]과 그 외 결합", // 안뭐더라
    "그 외 받침과 초성 [ㄱㄲㅋ]결합 [ㅗㅚㅛㅜㅠㅡ]", // 긴ㅗ 높은ㅚㅛㅜㅠㅡ 
    "그 외 높은종성결합 [ㅡㅗ] 또는 초성[ㅅㅆㅉ]결합 [ㅗㅚㅛㅜㅠㅡ]", // 높은ㅗㅚㅛㅜㅠㅡ
    "그 외 낮은종성 또는 그 외 초성결합 [ㅗㅚㅛㅡ]",
    "일부 낮은종성과 높은초성결합 [ㅘㅙㅚㅝㅢ]",
    "그 외 받침과 그 외 중성",
  ],
  jongseong: [
    "중성 [ㅏ ㅑ ㅓ ㅕ ㅟ ㅣ]",
    "중성 [ㅐ ㅒ ㅔ ㅖ ㅘ ㅙ ㅚ ㅝ ㅞ ㅢ ]",
    "초성 [ㄱ ㄲ ㅅ ㅆ ㅉ ㅋ]과 중성 [ㅗ ㅛ] 결합", // 높은ㅗ
    "그 외 초성과 중성 [ㅗ ㅛ] 결합",
    "초성[ㄱㄲㅋㅅㅆㅉ]결합 또는 높은종성결합 중성[ㅜㅠㅡ]", // 높은ㅡ
    "낮은종성[ㄱㄴㄷㅁㅅㅇㅈㅍ]결합 중성[ㅜㅠㅡ]",
    "더미",
  ],
})

export const HANGUL_TEMPLATES: {[k:string]: HangulTemplate} = {
  POKE_PT: hangulTemplatePokePT,
}
