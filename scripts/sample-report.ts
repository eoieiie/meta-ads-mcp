import { renderCardNewsReview } from "../src/report.js";
import { reviewCardNews } from "../src/scoring.js";

const review = reviewCardNews(
  { name: "빛", spendKrw: 19354, profileVisits: 248, follows: 32 },
  { name: "관리", spendKrw: 686, profileVisits: 12, follows: 6 }
);

console.log(renderCardNewsReview(review));
