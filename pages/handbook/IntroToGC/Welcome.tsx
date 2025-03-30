// pages/handbook/IntroToGC/Welcome.tsx
import HandbookLayout from "../../../components/handbook_components/handbook_layout";
import HandbookSection from "../../../components/handbook_components/handbook_section";

const Chapter2Subchapter1Page = () => {
  return (
    <HandbookLayout>
      <HandbookSection
        title="HB/S2 - Getting started"
        blocks={[
          {
            blockTitle: "HB/GB-16 - Introduction to GlobalConflicts",
            blockContent: (
              <p>GlobalConflicts is an Arma community formed by people from different countries with more than 15 years of experience throughout the Arma series. 
                Teamwork, tactical play and good fun are our core values. 
                We achieve this by encouraging a culture of mutual improvement and enthusiasm for authentic scenarios in our missions. 
                While our missions have a defined chain-of-command, such is not the same for our community. 
                There are no ranks or e-salutes here, everyone is encouraged to take critical roles and leadership in-game.
                </p>
            ),
            buttonLabel: "Guide",
          },
          {
            blockTitle: "HB/VB-17 - Video: How to play at GlobalConflicts",
            blockContent: (
              <div className="w-full max-w-[900px] mx-auto aspect-video">
                <iframe
                  width="100%"
                  height="100%"
                  src="https://www.youtube.com/embed/_SW1tEkcfRU"
                  title="How to play at GlobalConflicts"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            ),
            buttonLabel: "Guide",
          },
          {
            blockTitle: "HB/GB-18 - Realism where it matters",
            blockContent: (
              <p>We use numerous mods and custom systems to enhance the realism and enjoyment of our missions. 
                Our approach to realism is guided by the principle of "Gameplay First Realism," 
                which means we focus on aspects of military simulation that enhance immersion and effectiveness, without sacrificing our sanity and fun.
                </p>
            ),
            buttonLabel: "Guide",
          },
          {
            blockTitle: "HB/GB-19 - Game sessions",
            blockContent: (
              <div>
              <p>GC operates on a fixed schedule of play sessions starting on Saturday and Sunday at 1500EST/2000UTC, and continuing for several hours until the session naturally comes to a close. 
                Occasionally extra play sessions are hosted if there is demand during the week. 
                An Admin or Game Moderator will ping everybody with the @Arma Reforger role in discord when a session is beginning. 
                If you wish to get these pings, make sure you check the corresponding box in the Channels & Roles section of the Discord.
                </p>
                <img
                  src="https://i.imgur.com/wEmDRAH.png"
                  alt="Reforger Role"
                  className="mt-2 rounded"
                />
              </div>
            ),
            buttonLabel: "Guide",
          },
        ]}
      />
      <HandbookSection
        title="Section 2"
        blocks={[
          {
            blockTitle: "Block D",
            blockContent: "This is Block D with plain text.",
            buttonLabel: "Policy",
          },
          {
            blockTitle: "Block E - Bullet Points",
            blockContent: (
              <ul className="list-disc pl-5">
                <li>E1: First item.</li>
                <li>E2: Second item.</li>
                <li>E3: Third item.</li>
              </ul>
            ),
            buttonLabel: "Guide",
          },
          {
            blockTitle: "Block F - Image",
            blockContent: (
              <img
                src="https://via.placeholder.com/200"
                alt="Larger Example"
                className="rounded"
              />
            ),
            buttonLabel: "Skill",
          },
          {
            blockTitle: "Block G - Mixed",
            blockContent: (
              <div>
                <p>Block G has both:</p>
                <ul className="list-disc pl-5">
                  <li>Item one.</li>
                  <li>Item two.</li>
                </ul>
                <img
                  src="https://via.placeholder.com/120"
                  alt="Mixed Example"
                  className="mt-2 rounded"
                />
              </div>
            ),
            buttonLabel: "Policy",
          },
        ]}
      />
    </HandbookLayout>
  );
};

export default Chapter2Subchapter1Page;