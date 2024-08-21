import {
  For
} from 'solid-js';
import { Component } from 'solid-js';
import { Collapsible } from "@kobalte/core/collapsible";
import {NavLink} from './components/NavLink';
import {
  TrainLabel,
} from "./db-fixture";
import { NavigationMenu } from "@kobalte/core/navigation-menu";

export interface NavBarProps {
  toggleNav: () => void,
  setSelectedTrainLabel: (label: string) => void,
  checkedTrainLabels: () => TrainLabel[]
}

export const NavBar: Component<NavBarProps> = (props) => {
  const handleClickNavLink = () => {
    props.toggleNav()
    props.setSelectedTrainLabel('')
  }

  return (
      <NavigationMenu>
        <NavigationMenu.Menu>
          <Collapsible.Trigger as='a' >
            <NavLink 
              testid='nostrposts-link'
              href='/rssposts'
              onClick={() => {
                props.setSelectedTrainLabel('nostr')
              }}
            >
              Posts
            </NavLink>
          </Collapsible.Trigger>
          <For each={props.checkedTrainLabels()}>
            {
              (trainLabel) => (
                <div class="ml-2">
                  <NavLink
                    testid={`rssposts-${trainLabel.id}-link`}
                    href={`/rssposts/${trainLabel.id}`}
                    onClick={() => handleClickNavLink()}
                  >
                    {`${trainLabel.id}`}
                  </NavLink>
                </div>
              )
            }
          </For>
          <div class="ml-2">
            <NavLink 
              testid='nostrposts-link'
              href='/nostrposts'
              onClick={() => {
                props.setSelectedTrainLabel('nostr')
              }}
            >
              Nostr&nbsp;Global
            </NavLink>
          </div>
          <div>
            Settings
          </div>
          {
            Object.entries(
              {
                rssfeeds: "RSS Feeds",
                trainlabels: "Train Labels",
                alby: "Alby Signin",
                cors: "Cors Proxies",
                nostrrelays: "Nostr Relays",
                nostrkeys: "Nostr Keys",
                classifiers: "Classifiers",
                consortia: "Consortia",
                encryptionkeys: "Encryption Keys"
              }
            ).map((entry) => {
              return (
                <div class="ml-2">
                  <Collapsible.Trigger as='a' >
                    <NavLink testid={`${entry[0]}-link`} href={`/${entry[0]}`} onClick={() => handleClickNavLink()}>
                      {`${entry[1]}`}
                    </NavLink>
                  </Collapsible.Trigger>
                </div>
              )
            })
          }
        </NavigationMenu.Menu>
      </NavigationMenu>
    )
  }
export default NavBar;