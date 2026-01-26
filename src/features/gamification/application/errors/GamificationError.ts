import { GamificationErrorCode } from "./GamificationErrorCode";

export type GamificationError =
  | { code: GamificationErrorCode.EventoNaoElegivel }
  | { code: GamificationErrorCode.EventoJaObservado }
  | { code: GamificationErrorCode.ViolacaoAntiAbuso }
  | { code: GamificationErrorCode.CriterioNaoSatisfeito }
  | { code: GamificationErrorCode.ConquistaJaConcedida }
  | { code: GamificationErrorCode.EventoIncompativelComStreak }
  | { code: GamificationErrorCode.AcessoForaDoTenant }
  | { code: GamificationErrorCode.HistoricoInexistente };
