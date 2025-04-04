// pages/handbook/IntroToGC/Structure.tsx
import HandbookLayout from "../../../components/handbook_components/handbook_layout";
import HandbookSection from "../../../components/handbook_components/handbook_section";

const Chapter1Subchapter4Page = () => {
  return (
    <HandbookLayout>
      <HandbookSection
        title="HB/S5 - GC Chain of Command and Structure"
        blocks={[
          {
            blockTitle: "HB/PB-29 - Understanding the GC Structure",
            blockContent: (
              <p>The entire structure of Global Conflicts is voluntary, nobody is required to do anything above and beyond. 
                However that does not mean there are no baseline expectations. 
                If a role is volunteered for, it is expected a best effort is given, and if a role is no longer desired, it is expected the member steps down from that role. 
                This is true for both in and out of the game.</p>
            ),
            buttonLabel: "Policy",
          },
          {
            blockTitle: "HB/PB-30 - In Game Chain of Command",
            blockContent: (
              <div>
              <p>The chain of command is set by the current mission that is being played, and is to be respected for the duration of the mission.  Any player is free to, and encouraged to take leadership, and anyone under their command is expected to follow orders no matter who they are out of game. Example: An Admin that is slotted as a rifleman is expected to follow orders of their squad leader even if the squad leader is a new player.
              </p>
              <br>
              </br>
              <p>This however does not mean subordinates are required to break rules if a new player orders them to, they are to be politely informed what they are doing is wrong and if conflict arises, a GM is to be notified to handle the situation.
              </p>
              </div>
            ),
            buttonLabel: "Policy",
          },
          {
            blockTitle: "Block C - Mixed Content",
            blockContent: (
              <div>
                <p>Here’s some text with bullet points and an image:</p>
                <ul className="list-disc pl-5">
                  <li>Point one about Block C.</li>
                  <li>Point two with a twist.</li>
                </ul>
                <img
                  src="https://via.placeholder.com/100"
                  alt="Small Example"
                  className="mt-2 rounded"
                />
              </div>
            ),
            buttonLabel: "Skill",
          },
        ]}
      />
      <HandbookSection
        title="HB/S6 - Global Conflicts Teams"
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

export default Chapter1Subchapter4Page;