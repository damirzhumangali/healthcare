import type { BedsideConsultationView } from "./onlineConsultations";

export type AimarMeasurementPhase = "sent" | "measuring" | "success" | "error";

export type AimarMeasurementState = {
  consultId: string;
  phase: AimarMeasurementPhase;
  message: string;
  createdAt?: string;
  tempC?: number;
  hr?: number;
};

export type AimarMeasurementCommandContext = {
  consultId: string;
  patientId: string;
  wardLabel: string;
  bedLabel: string;
  robotUnit: string;
  meetRoomId?: string;
};

export type AimarMeasurementResultDetail = AimarMeasurementCommandContext & {
  createdAt: string;
  tempC: number;
  hr: number;
};

export const AIMAR_MEASUREMENT_COMMAND_EVENT = "healthassist:aimar-measurement-command";
export const AIMAR_MEASUREMENT_RESULT_EVENT = "healthassist:aimar-measurement-result";

export function canRunAimarMeasurement(
  consult: Pick<BedsideConsultationView, "deliveryMode" | "stage" | "devices">,
) {
  return consult.deliveryMode === "online" && consult.stage === "live" && consult.devices.robotLinked;
}

export function getAimarMeasurementDisabledReason(
  consult: Pick<BedsideConsultationView, "deliveryMode" | "stage" | "devices">,
) {
  if (consult.deliveryMode !== "online") return "Измерение доступно только для онлайн-консультации через AIMAR";
  if (consult.stage !== "live") return "Измерение доступно только во время активного звонка";
  if (!consult.devices.robotLinked) return "Робот не подключён";
  return "";
}

export function resolveAimarMeasurementPatientId(
  consult: Pick<BedsideConsultationView, "patientId">,
) {
  return String(consult.patientId || "").trim();
}

export function resolveAimarMeasurementValues(
  consult: Pick<BedsideConsultationView, "vitals" | "realTempC" | "realHr">,
) {
  return {
    tempC: consult.realTempC != null ? Number(consult.realTempC.toFixed(1)) : Number(consult.vitals.tempC.toFixed(1)),
    hr: consult.realHr != null ? Math.round(consult.realHr) : Math.round(consult.vitals.pulseBpm),
  };
}

export function buildAimarMeasurementCommandContext(
  consult: Pick<BedsideConsultationView, "id" | "patientId" | "wardLabel" | "bedLabel" | "robotUnit" | "meetRoomId">,
): AimarMeasurementCommandContext {
  return {
    consultId: consult.id,
    patientId: resolveAimarMeasurementPatientId(consult),
    wardLabel: consult.wardLabel,
    bedLabel: consult.bedLabel,
    robotUnit: consult.robotUnit,
    meetRoomId: consult.meetRoomId,
  };
}

export function dispatchAimarMeasurementCommand(detail: AimarMeasurementCommandContext) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AIMAR_MEASUREMENT_COMMAND_EVENT, { detail }));
}

export function dispatchAimarMeasurementResult(detail: AimarMeasurementResultDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AIMAR_MEASUREMENT_RESULT_EVENT, { detail }));
}
