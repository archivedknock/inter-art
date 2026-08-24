// 작품 목록 — 메인 페이지와 각 작품 페이지가 함께 쓴다.
//
// 작품마다 페이지가 하나씩 있어 주소로 바로 들어갈 수 있다.
// id는 효과 이름이자 저장 파일 이름에 쓰인다.

export const WORKS = {
  save: {
    name: "저장 버튼 누르기 챌린지",
    icon: "💾",
    page: "save.html",
    tag: "달아나는 Save 버튼을 검지로 눌러 보세요",
    tasks: ["hand"],
  },
  pray: {
    name: "렌더링 성공 기도하기",
    icon: "🙏",
    page: "pray.html",
    tag: "합장이든 반장이든, 기도하는 만큼 렌더링이 빨라집니다",
    tasks: ["hand"],
  },
  undo: {
    name: "Ctrl+Z 충전소",
    icon: "🔋",
    page: "undo.html",
    tag: "달아나는 Ctrl+Z를 검지 끝으로 잡으세요",
    tasks: ["hand"],
  },
  juggle: {
    name: "삐에로 저글링",
    icon: "🤹",
    page: "juggle.html",
    tag: "손바닥으로 어도비를 튕겨 올립니다",
    tasks: ["hand", "face", "seg"],   // 분장에 얼굴, 배경을 오려내는 데 세그멘테이션이 필요하다
  },
  coffee: {
    name: "커피콩 받기",
    icon: "☕",
    page: "coffee.html",
    tag: "주먹을 쥐면 머그컵을 잡습니다",
    tasks: ["hand", "face"],   // 눈 효과에 얼굴 모델이 필요하다
  },
};
