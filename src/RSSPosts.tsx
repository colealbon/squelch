import {
  For,
  Show,
  createEffect,
  createSignal,
  createResource
} from 'solid-js'
import {
  useParams
} from '@solidjs/router'
import {
  Title
  ,Meta 
} from "@solidjs/meta";
import WinkClassifier from 'wink-naive-bayes-text-classifier'
import * as Y from 'yjs'
import {PageHeader} from './components/PageHeader'
import PostDisplay from './PostDisplay'
import PostTrain from './PostTrain'
import {
  SkeletonPost
} from './components/SkeletonPost'

import {
  prepNLPTask,
  shortUrl,
  shortGuid,
  parsePosts,
  htmlInnerText,
  similarity,
  scoreRSSPosts,
  fetchRssPosts
} from './util'
import {Classifier} from './Classifiers'



const Posts = (props: {
  trainLabel: string,
  metadata: {
    description: string, 
    title: string, 
    keywords: string
  },
  train?: any,
  markComplete: any,
  setSelectedTrainLabel: any,
  fetchRssParams: any,
  classifiers: any
}) => {
  const [dedupedRSSPosts, setDedupedRSSPosts] = createSignal('')
  const [processedPostsForSession, setProcessedPostsForSession] = createSignal('')
  const [parsedRSSPosts, setParsedRSSPosts] = createSignal('')
  const [preppedRSSPosts, setPreppedRSSPosts] = createSignal('')
  const [rssPosts, setRSSPosts] = createSignal('')
  const [fetchedRSSPosts, {mutate: mutateRssPosts}] = createResource(props.fetchRssParams, fetchRssPosts)

  const ydocProcessedPosts = new Y.Doc()
  // const processedPostsWebRtcProvider = processedPostsRoomId() != '' ? new WebrtcProvider(processedPostsRoomId(), ydocProcessedPosts, { signaling: ['wss://fictionmachine.io/websocket'] }) : ''
  // const processedPostsIndexeDBProvider = new IndexeddbPersistence('processedposts', ydocProcessedPosts)
  const yProcessedPosts = ydocProcessedPosts.getMap()

  yProcessedPosts.observeDeep(event => {
    // console.log(event)
  })
  
  setDedupedRSSPosts('')
  //mutateRssPosts(() => [])

  createEffect(() => {
    try {
      if (`${useParams().trainlabel}` === 'undefined') {
        props.setSelectedTrainLabel('')
        return
      }
      props.setSelectedTrainLabel(`${useParams().trainlabel}`)
    } catch (error) {
      console.log(error)
      return
    }
  })

  
  createEffect(() => {
    if (preppedRSSPosts() == '') {
      return
    }
    const newDedupedRSSPosts = JSON.parse(preppedRSSPosts())
    .filter((postItem: any) => {
      const processedPostsID = postItem.feedLink === "" ? postItem.guid : shortUrl(postItem.feedLink)
      const processedPostsForFeedLink = yProcessedPosts.get(processedPostsID) as Array<string>
      if (processedPostsForFeedLink == undefined) { 
        return true
      }
      return !processedPostsForFeedLink.find((processedPost: string) => {
        // todo do not hardcode .8, use some statistics - or understand how .8 is derived from stats
        return similarity(
          `${processedPost}`,
          `${postItem.mlText}`
        ) > 0.8
      })
    })
    setDedupedRSSPosts(JSON.stringify(newDedupedRSSPosts))
  })
  createEffect(() => {
    if (`${parsedRSSPosts()}` === '') {
      return
    }
    const newPreppedRSSPosts = JSON.parse(parsedRSSPosts()).flat() && JSON.parse(parsedRSSPosts()).flat()
      .filter((post: {mlText: string}) => post && `${post.mlText}`.trim() != '')
      .filter((post: {postTitle: string}) => {
        return post.postTitle != null
      })
      .map((post: {postTitle: string})  => {
        return {
          ...post,
          postTitle: htmlInnerText(post?.postTitle)
        }
      })
      .filter((post: {
        feedLink?: string,
        guid: string
      }) => post?.feedLink || post?.guid != null)
    setPreppedRSSPosts(JSON.stringify(newPreppedRSSPosts))
  })
    
  createEffect(() => {
    if (fetchedRSSPosts() == undefined) {
      return
    }
    try {
      if (!JSON.parse(fetchedRSSPosts() as string)) {
        return
      }
    } catch {
      return
    }
    const fetchedRSSPostsStr: string = fetchedRSSPosts() as unknown as string
    if (fetchedRSSPostsStr === '') {
      return
    }
    const fetchedPostsArr = JSON.parse(fetchedRSSPostsStr)
    parsePosts(fetchedPostsArr)
    .then((newParsedPosts) => {
        if ([newParsedPosts?.flat()].length === 0) {
          return
        }
      const newParsedPostsStr: string = JSON.stringify(newParsedPosts)
      setParsedRSSPosts(newParsedPostsStr)
    })
  })
  createEffect(() => {
    if (dedupedRSSPosts() == '') {
      return
    }
    const suppressOdds: number = parseFloat(props.classifiers.find((classifierEntry: Classifier) => classifierEntry?.id == props.trainLabel)?.thresholdSuppressOdds || '999')
    const winkClassifier = WinkClassifier()
    winkClassifier.definePrepTasks( [ prepNLPTask ] )
    winkClassifier.defineConfig( { considerOnlyPresence: true, smoothingFactor: 0.5 } )
    const classifierModel: string = props.classifiers.find((classifierEntry: any) => classifierEntry?.id == props.trainLabel)?.model || ''
    if (classifierModel != '') {
      winkClassifier.importJSON(classifierModel)
    }
    const RSSPosts = JSON.parse(dedupedRSSPosts())


    const newScoredRSSPosts = scoreRSSPosts(RSSPosts, winkClassifier)
      .sort((a: any, b: any) => (a.prediction.suppress > b.prediction.suppress) ? 1 : -1)
      .filter((post: {
        prediction: {
          promote: number
        }
      }) => {
        if (`${props.trainLabel}` == '') {
          return true
        }
        if (suppressOdds == undefined ) {
          return true
        }
        if (post.prediction.promote == undefined) {
          return true
        }
        return post.prediction.promote >= suppressOdds * -1
      })
      setRSSPosts(JSON.stringify(newScoredRSSPosts))
  })
  createEffect(() => {
    if (dedupedRSSPosts() == '') {
      return
    }
    const suppressOdds: number = parseFloat(props.classifiers.find((classifierEntry: Classifier) => classifierEntry?.id == props.trainLabel)?.thresholdSuppressOdds || '999')
    const winkClassifier = WinkClassifier()
    winkClassifier.definePrepTasks( [ prepNLPTask ] )
    winkClassifier.defineConfig( { considerOnlyPresence: true, smoothingFactor: 0.5 } )
    const classifierModel: string = props.classifiers.find((classifierEntry: any) => classifierEntry?.id == props.trainLabel)?.model || ''
    if (classifierModel != '') {
      winkClassifier.importJSON(classifierModel)
    }
    const RSSPosts = JSON.parse(dedupedRSSPosts())
    const newScoredRSSPosts = scoreRSSPosts(RSSPosts, winkClassifier)
      .sort((a: any, b: any) => (a.prediction.suppress > b.prediction.suppress) ? 1 : -1)
      .filter((post: {
        prediction: {
          promote: number
        }
      }) => {
        if (`${props.trainLabel}` == '') {
          return true
        }
        if (suppressOdds == undefined ) {
          return true
        }
        if (post.prediction.promote == undefined) {
          return true
        }
        return post.prediction.promote >= suppressOdds * -1
      })
      setRSSPosts(JSON.stringify(newScoredRSSPosts))
  })

  return (
    <>
      <Title>{`cafe-society.news - ${props.trainLabel}`}</Title>
      <Meta name="description" content={`${props.metadata?.description}`} />
      <Meta name="title" content={props.metadata?.title} />
      <Meta name="keywords" content={props.metadata?.keywords} />
      <PageHeader>{props.trainLabel || 'all rss posts'}</PageHeader>
      <For
        each={rssPosts() && JSON.parse(rssPosts())!.filter((post: {
          feedLink?: string,
          guid?: string
        }) => {
          const processedPostsID = `${post.feedLink}` === "" ? shortGuid(`${post.guid}`) : shortUrl(`${post.feedLink}`)
          return processedPostsID !== undefined
        })}                       
        fallback={
          <div class="pl-6">
            <SkeletonPost /> <SkeletonPost />
          </div>
        }
      >
        {(post) => {
          const processedPostsID = `${post.feedLink}` === "" ? shortGuid(post.guid) : shortUrl(`${post.feedLink}`)
          return (
            <Show when={!processedPostsForSession().includes(post.mlText)}>
              <PostDisplay {...post}/>
                <Show when={props.trainLabel != ''}>
                  <div class='justify-center m-0'>
                    <PostTrain
                      trainLabel={props.trainLabel}
                      train={(mlClass: string) => {
                          props.train({
                            mlClass: mlClass,
                            mlText: post.mlText
                          })
                      }}
                      mlText={post.mlText}
                      prediction={post.prediction}
                      docCount={post.docCount}
                      markComplete={() => {
                        setProcessedPostsForSession(processedPostsForSession().concat(post.mlText))
                        setTimeout(() => {
                          props.markComplete(post.mlText, processedPostsID)
                        }, 300)
                      }}
                    />
                  </div>
                </Show>
            </Show>
          )}}       
      </For>
    </>
  )
}
export default Posts;