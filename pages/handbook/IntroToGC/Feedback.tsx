// pages/handbook/IntroToGC/Feedback.tsx
import HandbookLayout from "../../../components/handbook_components/handbook_layout";
import HandbookSection from "../../../components/handbook_components/handbook_section";

const Chapter2Subchapter5Page = () => {
  return (
    <HandbookLayout>
      <HandbookSection
        title="HB/S7 - Giving Feedback"
        blocks={[
          {
            blockTitle: "HB/GB-41 - General",
            blockContent: (
                <p>During a session there is usually no time to give feedback. To minimize delay, Members are encouraged to use our Discords many routes to communicate their feedback directly to those who need to hear it.</p>
            ),
            buttonLabel: "Guide",
          },
          {
            blockTitle: "HB/GB-42 - Suggestion Threads",
            blockContent: (
                <p>If a member has a suggestion regarding anything related to the community, a Discord suggestion thread can be made. If it receives enough traction, a poll may then be put up by a Staff member to gauge member opinions on the suggested change.</p>
            ),
            buttonLabel: "Guide",
          },
          {
            blockTitle: "HB/GB-43 - After Action Reports (AAR)",
            blockContent: (
                <p>After or during each play session, a Discord AAR thread will be made. Within it members are encouraged to discuss gameplay related topics of the session, and give any feedback that they have.</p>
            ),
            buttonLabel: "Guide",
          },
          {
            blockTitle: "HB/GB-44 - Mission Feedback",
            blockContent: (
                <p>Feedback that is specific to an individual mission’s functional or technical workings is to be given to the mission maker via the mission feedback channel. If there is a bunch of feedback it is encouraged that a thread is created within the feedback channel so as to not flood the channel.</p>
            ),
            buttonLabel: "Guide",
          },
          {
            blockTitle: "HB/GB-45 - Leadership Feedback",
            blockContent: (
                <p>If a member wishes to, they can create a leadership feedback thread.  Within it members are encouraged to give any positive or negative feedback they have regarding the member's specific leadership.</p>
            ),
            buttonLabel: "Guide",
          },
          {
            blockTitle: "HB/GB-46 - Staff Feedback",
            blockContent: (
                <p>If a staff member wishes to, they can create a staff feedback thread. Within it members are encouraged to give any positive or negative feedback they have regarding the staff member's conduct.</p>
            ),
            buttonLabel: "Guide",
          },
        ]}
      />
    </HandbookLayout>
  );
};

export default Chapter2Subchapter5Page;