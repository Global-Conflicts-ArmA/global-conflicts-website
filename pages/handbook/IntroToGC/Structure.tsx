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
            blockTitle: "HB/PB-31 - Understanding the GC Structure",
            blockContent: (
              <p>The entire structure of Global Conflicts is voluntary, nobody is required to do anything above and beyond. 
                However that does not mean there are no baseline expectations. 
                If a role is volunteered for, it is expected a best effort is given, and if a role is no longer desired, it is expected the member steps down from that role. 
                This is true for both in and out of the game.</p>
            ),
            buttonLabel: "Policy",
          },
          {
            blockTitle: "HB/PB-32 - In Game Chain of Command",
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
            blockTitle: "HB/PB-33 - Out of Game Teams Structure",
            blockContent: (
              <div>
                <p>GC has a structure primarily of teams. 
                  The teams are curated by the Admin team, and are delegated to do specific tasks that their team specializes in, for the betterment of the community. 
                  Any member is free to volunteer for any team they wish to participate in.</p>
              </div>
            ),
            buttonLabel: "Policy",
          },
        ]}
      />
      <HandbookSection
        title="HB/S6 - Global Conflicts Teams"
        blocks={[
          {
            blockTitle: "HB/PB-34 - Administrator Team",
            blockContent: (
              <div>
                <p>The most senior role, has root access and control over the community. 
                  Major decisions should only be enacted after a consensus is reached with the admin team.</p>
                  <br></br>
                  <p className="pl-4"> Duties:</p>
                <ul className="list-disc pl-12">
                  <li>Ensure smooth operation of community events, interactions, and structures.</li>
                  <li>Management of Discord.</li>
                  <li>Management of Game servers.</li>
                  <li>Management of Teamspeak.</li>
                  <li>Management and enforcement of bans/punishments.</li>
                  <li>Login as admin in the game, if no GM is present.</li>
                </ul>
                </div>
            ),
            buttonLabel: "Policy",
          },
          {
            blockTitle: "HB/PB-35 - Game Moderator Team",
            blockContent: (
              <div>
                <p>The Game Moderator is there to moderate the player base in-game and out of game. GM’s also have a level of weight and control when it comes to internal decisions. Access to user logs of warnings/bans. </p>
                  <br></br>
                  <p className="pl-4"> Duties:</p>
                <ul className="list-disc pl-12">
                  <li>Ensure that the community is free from bullshit.</li>
                  <li>Moderation of the playerbase in and out of game sessions.</li>
                  <li>Moderation of Discord.</li>
                  <li>Management of Teamspeak.</li>
                  <li>Login into the game server as an admin to run the game session</li>
                </ul>
                </div>
            ),
            buttonLabel: "Policy",
          },
          {
            blockTitle: "HB/PB-36 - Public Relations Team",
            blockContent: (
              <div>
                <p>The Public Relations team handles public facing matters of the community.</p>
                  <br></br>
                  <p className="pl-4"> Duties:</p>
                <ul className="list-disc pl-12">
                  <li>Create content for the community social media platforms.</li>
                  <li>Manage the social media platforms.</li>
                  <li>Community engagement.</li>
                  <li>Maintaining the public image of the community.</li>
                </ul>
                </div>
            ),
            buttonLabel: "Policy",
          },
          {
            blockTitle: "HB/PB-37 - Training Team",
            blockContent: (
              <div>
                <p>The Training Team handles facilitation and creation of trainable methods in Arma.</p>
                  <br></br>
                  <p className="pl-4"> Duties:</p>
                <ul className="list-disc pl-12">
                  <li>Creation of training courses.</li>
                  <li>Creation of guides.</li>
                  <li>Hosting training courses.</li>
                  <li>Encouraging use of available training material.</li>
                </ul>
                </div>
            ),
            buttonLabel: "Policy",
          },
          {
            blockTitle: "HB/PB-38 - Discord Moderation Team",
            blockContent: (
              <div>
                <p>The Discord Moderation team handles moderation and enforcement of the rules on Discord.</p>
                  <br></br>
                  <p className="pl-4"> Duties:</p>
                <ul className="list-disc pl-12">
                  <li>Moderation the Discord server.</li>
                  <li>Facilitate community initiatives through the Discord server.</li>
                </ul>
                </div>
            ),
            buttonLabel: "Policy",
          },
          {
            blockTitle: "HB/PB-39 - Mission Review Team",
            blockContent: (
              <div>
                <p>The Mission Review Team screens all missions for bugs and quality control before they are published to be played.</p>
                  <br></br>
                  <p className="pl-4"> Duties:</p>
                <ul className="list-disc pl-12">
                  <li>Screen all missions for bugs and quality control.</li>
                  <li>Give advice on issues within a user's mission.</li>
                </ul>
                </div>
            ),
            buttonLabel: "Policy",
          },
          {
            blockTitle: "HB/PB-40 - Miscellaneous Roles",
            blockContent: (
              <div>
                <p>Other miscellaneous roles that don’t specifically fall under the umbrella of teams.</p>
                  <br></br>
                <ul className="list-disc pl-12">
                  <li><strong>Mission Tester:</strong> A user who has signed up to receive Discord pings for when a mission review officer is going to review a new mission.</li>
                  <li><strong>Donator:</strong> A user who has donated to the community.</li>
                  <li><strong>Member:</strong> A member is a user who has played at least 4 weekends with GC and has earned membership.</li>
                  <li><strong>New Guy:</strong> A new guy is a user who is new to the community. It’s the first role any user will be assigned, before progressing to a Member after 4 weekends.</li>
                </ul>
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