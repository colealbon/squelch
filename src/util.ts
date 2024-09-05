import { convert } from 'html-to-text'
import winkNLP, { Bow } from 'wink-nlp';
import model from 'wink-eng-lite-web-model';
import { XMLParser } from 'fast-xml-parser'
import type { Signal } from 'solid-js';
import { createSignal } from 'solid-js';
import axios from 'axios';
import { RSSFeed } from "./RSSFeeds";
import winkSimilarity from 'wink-nlp/utilities/similarity';
import { NostrFetcher } from "nostr-fetch"
import WinkClassifier from 'wink-naive-bayes-text-classifier'

const nlp = winkNLP( model );
const its = nlp.its;
const as = nlp.as;
const parser = new XMLParser();
const fetcher = NostrFetcher.init()

export const similarity: (a: string, b: string) => number = (a: string, b: string) => {
  const aDoc = nlp.readDoc( a );
  const bDoc = nlp.readDoc( b );
  const bowA: Bow = aDoc.tokens().out(its.value, as.bow) as Bow;
  const bowB: Bow = bDoc.tokens().out(its.value, as.bow) as Bow;
  return winkSimilarity.bow.cosine(bowA, bowB);
}

export const htmlInnerText = (input: string) => {
  return input
  .replace(/&#039;/g, "'")
  .replace(/&#8217;/g, "'")
  .replace(/&#8211;/g, "-")
  .replace(/&#8216;/g, "'")
  .replace(/&#8230;/g, "…")
  .replace(/&#038;/g, "&")
  .replace(/&#8221;/g, "'")
  .replace(/&#8220;/g, "'")
  .replace(/&#x2019;/g,"'")
  .replace(/&#x2018;/g,"'")
  .replace(/&#39;/g,"'")
  .replace(/&#34;/g,"'")
  .replace(/&gt;/g,">")
  .replace(/&lt;/g,"<")
  .replace(/&#43;/g,"+")
}

const removePunctuation = (text: string) => {
  return `${text}`
    .replace(/[/?…".,#!$%^&*;:{}=_`~()'’‘“”]/g, '')
    .replace(/\s{2,}/g, ' ');
};

export const shortUrl = (text: string) => {
  if (text === 'undefined') {
    return
  }
  if (text === '') {
    return
  }
  const theUrl = new URL(text);
  const newPath = removePunctuation(`${theUrl.hostname}${theUrl.pathname}`)
    .replace(/-/g, '')
    .toLowerCase();
  return newPath;
};

export const shortGuid = (input: string) => {
  try {
    const newShortGuid = shortUrl(input.replace(/\?.*$/,''))
    return newShortGuid
  } catch (error) {
    return input.replace(/\?.*$/,'')
  }
}

export const nHoursAgo = (hrs: number): number => Math.floor((Date.now() - hrs * 60 * 60 * 1000) / 1000);

export const prepNLPTask = function ( text: string ) {
    const tokens: string[] = [];
    nlp.readDoc(text)
        .tokens()
        // Use only words ignoring punctuations etc and from them remove stop words
        .filter( (t: any) => ( t.out(its.type) === 'word' && !t.out(its.stopWordFlag) ) )
        // Handle negation and extract stem of the word
        .each( (t: any) => tokens.push( (t.out(its.negationFlag)) ? '!' + t.out(its.stem) : t.out(its.stem) ) );
    return tokens;
  };

export function createStoredSignal<T>(
    key: string,
    defaultValue: T,
    storage = localStorage
  ): Signal<T> {
    const initialValue = storage.getItem(key) != undefined && storage.getItem(key) !== 'undefined'
      ? JSON.parse(`${storage.getItem(key)}`) as T
      : defaultValue;
    const [value, setValue] = createSignal<T>(initialValue);
    const setValueAndStore = ((arg: any) => {
      const v = setValue(arg);
      storage.setItem(key, JSON.stringify(v));
      return v;
    }) as typeof setValue;
    return [value, setValueAndStore];
  }

export const prepNostrPost = (post: any) => {
  return {
    mlText: prepNLPTask(convert(
      `${post.content}`
      .replace(/\d+/g, '')
      .replace(/#/g, ''),
      {
        ignoreLinks: true,
        ignoreHref: true,
        ignoreImage: true,
        linkBrackets: false,
        wordwrap: false
      }
    )
    )
    .filter((word: string) => word.length < 30)
    .filter((word: string) => word!='nostr')
    .filter((word: string) => word!='vmess')
    .join(' ')
    .toLowerCase() || '',

    links: convert(
      `${post.content}`,
      {
        ignoreLinks: true,
        ignoreHref: true,
        ignoreImage: true,
        linkBrackets: false,
        wordwrap: false
      }
      ).toLowerCase().match(/((file|http|https|ftp):\/\/[\w?=&.\/-;#~%-]+(?![\w\s?&.\/;#~%"=-]*>))/g),
    ...post
  }
}

export const parseRSS: ( content: {rss: any} ) => {
  feedTitle: string,
  feedLink: string,
  feedDescription: string,
  postId: string,
  postTitle: string,
  mlText: string
}[] = (content: {rss: any}) => {
  const feedTitle = content.rss.channel.title
  const feedLink = content.rss.channel.link
  const feedDescription = content.rss.channel.description
  const feedPosts = content.rss.channel.item?.length == null ?
    [content.rss.channel.item] :
    content.rss.channel.item

  return [...feedPosts]
    .map((itemEntry) => ({
      feedTitle: feedTitle,
      feedLink: `${feedLink}`,
      feedDescription: feedDescription,
      ...itemEntry
    }))
    .map(itemEntry => ({
      postSummary: convert(
        itemEntry.description,
        {
          ignoreLinks: true,
          ignoreHref: true,
          ignoreImage: true,
          linkBrackets: false
        })
      .replace(/\[.*?\]/g, '')
      .replace(/\n/g,' ')?.toString()
      .trim(),
      ...itemEntry
    }))
    .map(itemEntry => ({
      ...itemEntry,
      postId: itemEntry.link || itemEntry.guid,
      postTitle: itemEntry.title,
      mlText: prepNLPTask(convert(`${itemEntry.title} ${itemEntry.postSummary}`))
        .filter((word) => word.length < 30)
        .join(' ')
        .toLowerCase()
    })
  )
}

export const applyPrediction = (params: {
    post: any,
    classifier: any
  }) => {
    try {
      const docCount: number = params.classifier.stats().labelWiseSamples ? Object.values(params.classifier.stats().labelWiseSamples).reduce((val, runningTotal: any) => val as number + runningTotal, 0) as number : 0
      if (docCount > 2) {
        params.classifier.consolidate()
      }
      const prediction = Object.fromEntries(params.classifier.computeOdds(params.post?.mlText))
      const postWithPrediction = {
        ...params.post,
        ...{
          'prediction': prediction,
          'docCount': docCount
        }
      }
      return postWithPrediction
    } catch (error) {
      if (error != null) {
        const newPost = params.post
        newPost.prediction = params.classifier.stats()
        return newPost
      }
    }
  }

export const parseAtom = (content: any) => {
    const feedTitle = content.feed?.author?.name || content.feed?.feedTitle || content.feed?.title
    const feedLink = `${content.feed?.generator}${content.feed?.id}`
    const feedDescription = content.feed?.subtitle
    const feedPosts = content.feed?.entry
    return feedPosts?.map((itemEntry: any) => {
      const fixItemEntry = itemEntry.content ? itemEntry : itemEntry[0]
      return {
        feedTitle: feedTitle,
        feedLink: feedLink,
        feedDescription: feedDescription,
        ...fixItemEntry
      }})
      .map((itemEntry: any) => {
        return {
        postSummary: convert(itemEntry.content, { ignoreLinks: true, ignoreHref: true, ignoreImage: true, linkBrackets: false  })
        .replace(/\[.*?\]/g, '')
        .replace(/\n/g,' ')?.toString()
        .trim(),
        ...itemEntry
        }}
      )
      .map((itemEntry: any) => ({
        ...itemEntry,
        postId: `${itemEntry.id}`,
        postTitle: `${itemEntry.title}`,
        mlText: prepNLPTask(convert(`${itemEntry.title} ${itemEntry.postSummary}`))
          .filter((word) => word.length < 30)
          .join(' ')
          .toLowerCase()
      })
    )
  }
export const parsePosts = (postsXML: any[]) => {
  const parseQueue: any[] = []
  postsXML.forEach(xmlEntry => {
    parseQueue.push(new Promise(resolve => {
      try {
        const content = parser.parse(xmlEntry.data)
        const parsed = content.rss ? parseRSS(content) : parseAtom(content)
        resolve(parsed)
      } catch (error) {
        console.log(error)
        console.log(xmlEntry)
        resolve([])
      }
    }))
  })
  return Promise.all(parseQueue)
}
export function fetchRssPosts(params: string) {
  if (params == '') {
    return
  }
  const paramsObj = JSON.parse(params)
  if (paramsObj.feedsForTrainLabel.length < 1) {
    return
  }
  return new Promise((resolve) => {
    const fetchQueue: any[] = []
    paramsObj.feedsForTrainLabel.forEach((feed: RSSFeed) => {
      fetchQueue.push(new Promise((resolve) => {
        try {
          paramsObj.corsProxies?.slice().forEach((corsProxy: any) => {
            try {
              axios.get(`${corsProxy}${feed}`)
              .then(response => {
                resolve(response)
              })
            } catch(error) {
              console.log(`${corsProxy}${feed} failed`)
              console.log(error)
            }
          })
        } catch (error) {
          resolve('')
        }
      }))
    })
    Promise.all(fetchQueue)
    .then(fetchedPosts => {
      const fetchedPostsStr = JSON.stringify(fetchedPosts)
      resolve(fetchedPostsStr)
    })
  })
}

export function prePrepNostrPosts(nostrEvents : any) {
  return new Promise((resolve, reject) => {
    if (nostrEvents.length === 0) {
      reject(new Error('attempted to prePrep empty set of nostr messages'))
    }
    const newNostrEvents = nostrEvents.filter((nostrPost: any) => {
      return Object.fromEntries(nostrPost.tags)['e'] == null
    })
    .filter((nostrPost: any) => {
      return nostrPost.content.replace('vmess:','').length == nostrPost.content.length
    })
    resolve(newNostrEvents)
  })
}

export function scoreRSSPosts(RSSPosts : any, winkClassifier: any) {
  return RSSPosts
  .map((post: {
    prediction: any,
    classifier: any
  }) => applyPrediction({
    post: post,
    classifier: winkClassifier
  }))
}

export function fetchNostrPosts(params: string) {
  return new Promise((resolve) => {
    const paramsObj = JSON.parse(params)
    if (paramsObj.nostrRelayList?.length == 0) {
      return
    }
    const filterOptions = {
      kinds: [ 1, 30023 ]
    }
    fetcher.fetchAllEvents(
      [...paramsObj.nostrRelayList],
      filterOptions,
      { since: nHoursAgo(6) }
    )
    .then((allThePosts: any) => {
      const filteredPosts = allThePosts
      resolve(filteredPosts)
    })
  })
}
