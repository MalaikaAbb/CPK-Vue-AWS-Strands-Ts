export const scheduleMeeting = tool({
  name: "schedule_meeting",
  description:
    "Ask the user to pick a meeting time, then confirm what was scheduled.",
  inputSchema: z.object({
    topic: z.string().describe("Short description of the meeting purpose."),
    attendee: z.string().optional().describe("Who the meeting is with."),
  }),
  callback: ({ topic, attendee }, context) => {
    // Typed optional by the SDK, so this is checked rather than asserted: with
    // no context there is nothing to pause on, and pretending otherwise would
    // schedule a meeting the user never saw.
    if (!context) {
      throw new Error("schedule_meeting needs a tool context to pause on");
    }

    // `attendee` is optional and the reason has to be JSON, which has no
    // `undefined`, so it is omitted rather than sent as undefined.
    const answer = context.interrupt<ResumeEnvelope>({
      name: "schedule_meeting",
      reason: attendee === undefined ? { topic } : { topic, attendee },
    });

    // Three cancel shapes reach here: each bridge's own sentinel for a
    // cancelled resume entry, and the picker's Cancel button, which resolves
    // with a `cancelled` flag inside the payload.
    const { choice, cancelled } = readResume(answer);
    if (cancelled) {
      return `User cancelled. Meeting NOT scheduled: ${topic}`;
    }

    const label = choice.chosen_label || choice.chosen_time;
    return label
      ? `Meeting scheduled for ${label}: ${topic}`
      : `User did not pick a time. Meeting NOT scheduled: ${topic}`;
  },
});
