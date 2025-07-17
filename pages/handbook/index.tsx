// pages/handbook/index.tsx
import HandbookLayout from "../../components/handbook_components/handbook_layout";
import HandbookSection from "../../components/handbook_components/handbook_section";

const HandbookPage = () => {
  return (
    <HandbookLayout>
      <HandbookSection
        title="HB/S1 - Introduction to the GlobalConflicts Handbook (HB)"
        blocks={[
          {
            blockTitle: "HB/GB-01 - Purpose and Scope",
            blockContent: "The GC Handbook (HB) serves as a comprehensive guide, detailing the standard operating procedures, strategies, and foundational principles governing GlobalConflicts gameplay. Designed for both novice and experienced members, the HB encompasses the breadth and depth of GlobalConflicts' operational philosophy.",
            buttonLabel: "Guide",
          },
          {
            blockTitle: "HB/GB-02 - Chapters and Subchapters",
            blockContent: "The overarching organisational segments of the HB, these help in broadly categorizing the content, making navigation simpler.",
            buttonLabel: "Guide",
          },
          {
            blockTitle: "HB/GB-03 - Sections",
            blockContent: "Nested within Chapters (or Subchapters where applicable), these are collections of contextually connected content. Each section houses a series of blocks that align with the section’s thematic focus. Sections are assigned a reference such as: HB/SXX",
            buttonLabel: "Guide",
          },
          {
            blockTitle: "HB/GB-04 - Guide Blocks",
            blockContent: "Guides within the HB present best practices that offer valuable insights and suggestions for members. While they're less stringent than policies and are not enforced, they can provide context or play a crucial role in providing direction and recommended methods of operation, ensuring GlobalConflicts’ continued effectiveness and adaptability",
            buttonLabel: "Guide",
          },
          {
            blockTitle: "HB/GB-05 - Policy Blocks",
            blockContent: "Policies are immutable rules and regulations integral to the HB. They firmly shape GlobalConflicts' actions, behaviours, and overall ethos. As the bedrock of GlobalConflicts' standards, they establish the community's non-negotiable boundaries and are enforced by the community's staff.",
            buttonLabel: "Guide",
          },
          {
            blockTitle: "HB/GB-06 - Skill Blocks",
            blockContent: "Skills provide detailed breakdowns of an essential competency. They are designed to equip GC members for diverse roles and challenges. Each skill outlined in the HB is something everyone should, but is not required to, be competent in, and are designed to be simple monkey-see monkey-do skills to ensure proliferation among the playerbase. ",
            buttonLabel: "Guide",
          },
        ]}
      />
      <HandbookSection
        title="HB/S2 - Training Team"
        blocks={[
          {
            blockTitle: "HB/GB-07 - Introduction to the Training Team",
            blockContent: "The 'Training Team' is a group within the unit responsible for overseeing and managing training within GC. Comprising appointed individuals including Instructors, Admins, and Game Moderators. Their responsibilities range from providing subject matter expertise and facilitating training sessions, to ensuring that standards are met, skills are effectively taught and practiced, and feedback provided is constructive.",
            buttonLabel: "Guide",
          },
          {
            blockTitle: "HB/PB-08 - Training Instructors",
            blockContent: (
                <div>
                  <ul className="list-disc pl-5">
                    <li>Designated member of the community serving as a teacher for other members.</li>
                    <li>Acts as an advisor, providing guidance on potential changes and advising on ongoing discussions.</li>
                    <li>Active participant in training, course creation, and skill proliferation during sessions.</li>
                    <li>Active participant in feedback during AAR threads where applicable.</li>
                    <li>Accountable for the maintenance and support of future additions to the handbook.</li>
                    <li>Appointment made at the discretion of the Admins, or by community vote.</li>
                  </ul>
                </div>
              ),
            buttonLabel: "Policy",
          },
          {
            blockTitle: "HB/PB-09 - Administrators",
            blockContent: (
                <div>
                  <ul className="list-disc pl-5">
                    <li>Top ranking staff member among the community.</li>
                    <li>Responsible for maintaining the integrity of the training team.</li>
                    <li>Responsible for seeking out and appointing new members to the training team.</li>
                    <li>Active in ensuring that standards are met, skills are effectively taught and practiced, and feedback provided is constructive.</li>
                  </ul>
                </div>
              ),
            buttonLabel: "Policy",
          },
          {
            blockTitle: "HB/PB-10 - Game Moderators",
            blockContent: (
                <div>
                    <ul className="list-disc pl-5">
                        <li>Designated member of the community appointed by vote to run game sessions and enforce rules.</li>
                        <li>Active in ensuring that standards are met, skills are effectively taught and practiced, and feedback provided is constructive.</li>
                    </ul>
                </div>
            ),
            buttonLabel: "Policy",
          },
          {
            blockTitle: "HB/PB-11 - Observers",
            blockContent: (
                <div>
                    <ul className="list-disc pl-5">
                        <li>A member of the community appointed by the Training Instructors to sit in and observe training sessions.</li>
                    </ul>
                </div>
            ),
            buttonLabel: "Policy",
          },
          {
            blockTitle: "HB/PB-12 - Trainee",
            blockContent:  (
                <div>
                  <ul className="list-disc pl-5">
                    <li>A member of the community who wants to attend training sessions.</li>
                    <li>Expected to be open minded when attending training sessions.</li>
                    <li>Expected to want to learn when attending training sessions.</li>
                    <li>Add course-annoucements to your discord channel list to participate in sessions.</li>
                    <li>Add yourself to the Training role to be pinged about upcoming sessions.</li>
                  </ul>
                  <img
                    src="https://i.imgur.com/daBg8fb.png"
                    alt="trainingrole"
                    className="mt-2 rounded"
                  />
                </div>
              ),
            buttonLabel: "Policy",
          },
        ]}
      />
      <HandbookSection
        title="HB/S3 - Standards for each block type"
        blocks={[
          {
            blockTitle: "HB/GB-13 - Building a guide block",
            blockContent: (
                <div>
                  <p>A guide block:</p>
                  <ul className="list-disc pl-5">
                    <li>should have as it's primary content the text, not the attached image.</li>
                    <li>should not be something that is required knowledge.</li>
                    <li>could provide extra context, a more in-depth explanation, or a technical manual to use a specific piece of equipment.</li>
                    <li>should be no more than 4 short paragraphs, otherwise consider breaking it down.</li>
                  </ul>
                </div>
              ),
            buttonLabel: "Guide",
          },
          {
            blockTitle: "HB/GB-14 - Building a policy block",
            blockContent: (
                <div>
                  <p>A policy block:</p>
                  <ul className="list-disc pl-5">
                    <li>should be expected that every member knows and follows it.</li>
                    <li>should be something that is mandated and enforced by Game Moderators.</li>
                    <li>should be written in a manner where it is easy to determine whether an action contrary to the policy has occurred or not, with a well defined scope.</li>
                  </ul>
                </div>
              ),
            buttonLabel: "Guide",
          },
          {
            blockTitle: "HB/GB-15 - Building a skill block",
            blockContent: (
                <div>
                  <p>A skill block</p>
                  <ul className="list-disc pl-5">
                    <li>should be something that everyone ought to know but is not required.</li>
                    <li>should not cover some abstract concept, but be focused on a well defined skill that can be trained and easily proliferate among players.</li>
                    <li>should have title written as an imperative, in the form of: "Do action (to achieve this result)"</li>
                    <li>should be written as an imperative, without directly addressing the reader or addressing the reader in the third person.</li>
                    <li>should be written as bullet points instead of full sentences wherever possible.</li>
                    <li>should state the desired outcome of performing the skill.</li>
                    <li>should not force a single method on how the achieve the outcome.</li>
                  </ul>
                </div>
              ),
            buttonLabel: "Guide",
          },
        ]}
      />
    </HandbookLayout>
  );
};

export default HandbookPage;