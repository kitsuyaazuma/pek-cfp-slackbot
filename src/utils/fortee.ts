import { z } from "zod";

export const getUuidFromMessage = (message: string): string | null => {
  const regex =
    /https:\/\/fortee\.jp\/platform-engineering-kaigi-2025\/proposal\/([a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12})/i;
  const match = message.match(regex);
  return match ? match[1] : null;
};

const SpeakerSchema = z.object({
  name: z.string(),
  kana: z.string(),
});

const FeedbackSchema = z.object({
  open: z.boolean(),
});

const ProposalSchema = z.object({
  uuid: z.string().uuid(),
  url: z.string().url(),
  title: z.string(),
  abstract: z.string(),
  accepted: z.boolean(),
  speaker: SpeakerSchema,
  created: z.string(),
  feedback: FeedbackSchema,
});

const ApiResponseSchema = z.object({
  proposals: z.array(ProposalSchema),
});

export type Proposal = z.infer<typeof ProposalSchema>;

export const getProposal = async (uuid: string): Promise<Proposal | null> => {
  const apiUrl = `https://fortee.jp/platform-engineering-kaigi-2025/api/proposals/${uuid}`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      console.error(`API request failed with status: ${response.status}`);
      return null;
    }

    const data = await response.json();

    const parsedResponse = ApiResponseSchema.parse(data);

    if (parsedResponse.proposals.length > 0) {
      return parsedResponse.proposals[0];
    }

    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("API response validation failed:", error.errors);
    } else {
      console.error("An unexpected error occurred:", error);
    }
    return null;
  }
};
