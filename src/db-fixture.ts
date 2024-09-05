import Dexie, { Table } from "dexie";
import { NostrKey } from './NostrKeys'
import { EncryptionKey } from './EncryptionKeys'
import { NostrRelay } from './NostrRelays'
import { Classifier } from './Classifiers'
import { CorsProxy } from './CorsProxies'
export interface RSSFeed {
    "id": string,
    "npub": string,
    "checked": boolean,
    "trainLabels": string[],
    "consortia": string[]
}

export interface TrainLabel {
  "id": string,
  "checked": boolean
}

export interface ProcessedPost {
  "id": string,
  "processedPosts": string[]
}

export interface Consortium {
  "id": string,
  "label": string,
  "signerNpub": string,
  "memberPublicKeys": string[]
}

export class DbFixture extends Dexie {
  nostrkeys!: Table<NostrKey>;
  rssfeeds!: Table<RSSFeed>;
  corsproxies!: Table<CorsProxy>;
  trainlabels!: Table<TrainLabel>;
  classifiers!: Table<Classifier>;
  processedposts!: Table<ProcessedPost>;
  nostrrelays!: Table<NostrRelay>;
  consortia!: Table<Consortium>;
  encryptionkeys!: Table<EncryptionKey>;

  constructor() {
    super("db-fixture");
    this.version(2).stores({
      nostrkeys: "&publicKey",
      rssfeeds: "&id, npub, checked, *trainLabels",
      corsproxies: "&id",
      trainlabels: "&id",
      classifiers: "&id",
      processedposts: "&id",
      nostrrelays: "&id",
    })
    this.version(3).stores({
      nostrkeys: "&publicKey",
      rssfeeds: "&id, npub, checked, *trainLabels",
      corsproxies: "&id",
      trainlabels: "&id",
      classifiers: "&id",
      processedposts: "&id",
      nostrrelays: "&id",
      topics: "&id, label, checked, *subscribers",
    })
    this.version(4).stores({
      nostrkeys: "&publicKey",
      rssfeeds: "&id, npub, checked, *trainLabels",
      corsproxies: "&id",
      trainlabels: "&id",
      classifiers: "&id",
      processedposts: "&id",
      nostrrelays: "&id",
      consortia: "&id, label, signerNpub, *memberPublicKeys",
      encryptionkeys: "&publicKey, privateKey, label"
    })
    this.version(5).stores({
      nostrkeys: "&publicKey",
      rssfeeds: "&id, npub, checked, *trainLabels, *consortia",
      corsproxies: "&id",
      trainlabels: "&id",
      classifiers: "&id",
      processedposts: "&id",
      nostrrelays: "&id",
      consortia: "&id, label, signerNpub, *memberPublicKeys",
      encryptionkeys: "&publicKey, privateKey, label"
    })
    // .upgrade (tx => {
    //   return tx.table("rssfeeds").toCollection().modify (rssFeed => {
    //     rssFeed.npub = '';
    //   });
    // });
    this.version(1).stores({
      nostrkeys: "&publicKey",
      rssfeeds: "&id, checked, *trainLabels",
      corsproxies: "&id",
      trainlabels: "&id",
      classifiers: "&id",
      processedposts: "&id",
      nostrrelays: "&id",
    });
  }
}
