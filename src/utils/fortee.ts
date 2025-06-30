import { z } from "zod";

const FORTEE_API_BASE_URL =
  "https://fortee.jp/platform-engineering-kaigi-2025/api";

export const getUuidFromMessage = (message: string): string | null => {
  const regex =
    /https:\/\/fortee\.jp\/platform-engineering-kaigi-2025\/proposal\/([a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12})/i;
  const match = message.match(regex);
  return match ? match[1] : null;
};

export const normalizeNewlines = (text: string): string => {
  return text.replace(/\r\n|\r|\n/g, "\n");
};

const kanaValidation = z.string().superRefine((text, ctx) => {
  const sections = {
    name: {
      regex: /■お名前の呼び方（カナ）□([^■]*)/,
      message: "「お名前の呼び方（カナ）」の項目に値がありません",
    },
    company: {
      regex: /■会社名\/所属団体名 - Company\/Organizations□([^■]*)/,
      message: "「会社名/所属団体名」の項目に値がありません",
    },
    title: {
      regex: /■役職 - Job Title□([^■]*)/,
      message: "「役職」の項目に値がありません",
    },
  };

  for (const section of Object.values(sections)) {
    const match = text.match(section.regex);

    if (!match || match[1].trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: section.message,
      });
    }
  }
});

const abstractValidation = z.string().superRefine((text, ctx) => {
  const bioHeader =
    "■スピーカープロフィール (200文字以内) - Biography (Less than 400 letters)□";
  const summaryHeader =
    "■ トーク概要 (400文字以内) - Abstract (Less than 800 letters)□";
  let hasError = false;
  if (!text.includes(bioHeader)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `「${bioHeader}」が含まれていません`,
    });
    hasError = true;
  }
  if (!text.includes(summaryHeader)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `「${summaryHeader}」が含まれていません`,
    });
    hasError = true;
  }
  if (hasError) {
    return;
  }

  const bioRegex =
    /■スピーカープロフィール \(200文字以内\) - Biography \(Less than 400 letters\)□\s*([\s\S]*?)(?=\r\n■|$)/;
  const bioMatch = text.match(bioRegex);

  // TODO: Support English biography
  if (bioMatch && bioMatch[1]) {
    const bioText = bioMatch[1].trim();
    const normalizedBioText = normalizeNewlines(bioText);
    if (normalizedBioText.length > 200) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_big,
        maximum: 200,
        type: "string",
        inclusive: true,
        message: `スピーカープロフィールの文字数がオーバーしています（現在：${normalizedBioText.length}文字、上限：200文字）`,
      });
    }
  } else {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "スピーカープロフィールの本文が見つかりません",
    });
  }

  const summaryRegex =
    /■ トーク概要 \(400文字以内\) - Abstract \(Less than 800 letters\)□\s*([\s\S]*)/;
  const summaryMatch = text.match(summaryRegex);

  // TODO: Support English abstract
  if (summaryMatch && summaryMatch[1]) {
    const summaryText = summaryMatch[1].trim();
    const normalizedSummaryText = normalizeNewlines(summaryText);
    if (normalizedSummaryText.length > 400) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_big,
        maximum: 400,
        type: "string",
        inclusive: true,
        message: `トーク概要の文字数がオーバーしています（現在：${normalizedSummaryText.length}文字、上限：400文字）`,
      });
    }
  } else {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "トーク概要の本文が見つかりません",
    });
  }
});

const ProposalSchema = z.object({
  uuid: z.string().uuid(),
  url: z.string().url(),
  title: z.string(),
  abstract: z.string(),
  accepted: z.boolean(),
  speaker: z.object({
    name: z.string(),
    kana: z.string(),
  }),
  created: z.string(),
  feedback: z.object({
    open: z.boolean(),
  }),
});

const CustomProposalSchema = ProposalSchema.merge(
  z.object({
    abstract: abstractValidation,
    speaker: z.object({
      name: z.string(),
      kana: kanaValidation,
    }),
  }),
);

const ApiResponseSchema = z.object({
  proposals: z.array(ProposalSchema),
});

export type Proposal = z.infer<typeof ProposalSchema>;
export type CustomProposal = z.infer<typeof CustomProposalSchema>;

export type ValidationResult =
  | {
      success: true;
      proposal: CustomProposal;
    }
  | {
      success: false;
      uuid?: string;
      error: z.ZodError | Error;
    };

export const validateProposal = async (
  uuid: string,
): Promise<ValidationResult> => {
  const apiUrl = `${FORTEE_API_BASE_URL}/proposals/${uuid}`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      return {
        success: false,
        error: new Error(
          `APIリクエストに失敗しました（スタータス：${response.status}）`,
        ),
      };
    }

    const data = await response.json();
    const result = ApiResponseSchema.safeParse(data);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    if (result.data.proposals.length === 0) {
      return {
        success: false,
        error: new Error("APIレスポンスにプロポーザルが含まれていませんでした"),
      };
    }

    const proposal = result.data.proposals[0];
    const customResult = CustomProposalSchema.safeParse(proposal);
    if (!customResult.success) {
      return { success: false, error: customResult.error };
    }

    return { success: true, proposal: customResult.data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error
          : new Error("不明なエラーが発生しました"),
    };
  }
};

export const validateAllProposals = async (): Promise<ValidationResult[]> => {
  const apiUrl = `${FORTEE_API_BASE_URL}/proposals`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      return [
        {
          success: false,
          error: new Error(
            `APIリクエストに失敗しました（スタータス：${response.status}）`,
          ),
        },
      ];
    }

    const data = await response.json();
    const result = ApiResponseSchema.safeParse(data);

    if (!result.success) {
      return [{ success: false, error: result.error }];
    }

    const validationResults: ValidationResult[] = result.data.proposals.map(
      (proposal) => {
        const customResult = CustomProposalSchema.safeParse(proposal);
        if (customResult.success) {
          return { success: true, proposal: customResult.data };
        } else {
          return {
            success: false,
            uuid: proposal.uuid,
            error: customResult.error,
          };
        }
      },
    );
    return validationResults;
  } catch (error) {
    return [
      {
        success: false,
        error:
          error instanceof Error
            ? error
            : new Error("不明なエラーが発生しました"),
      },
    ];
  }
};

export const getAllProposals = async (): Promise<Proposal[]> => {
  const apiUrl = `${FORTEE_API_BASE_URL}/proposals`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(
        `APIリクエストに失敗しました（ステータス：${response.status}）`,
      );
    }

    const data = await response.json();
    const result = ApiResponseSchema.safeParse(data);

    if (!result.success) {
      throw new Error(`APIレスポンスの解析に失敗しました：${result.error}`);
    }
    return result.data.proposals;
  } catch (error) {
    throw error instanceof Error
      ? error
      : new Error("不明なエラーが発生しました");
  }
};
