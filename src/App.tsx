import { IndexeddbPersistence } from 'y-indexeddb'
import { NavBar } from './NavBar.tsx'
import { Button } from './components/Button.tsx'
import { Collapsible } from "@kobalte/core/collapsible";
import {
  createSignal,
  createResource,
  lazy,
  createEffect
} from 'solid-js'
import type {
  Component
} from 'solid-js'
import { createDexieArrayQuery } from "solid-dexie"
import WinkClassifier from 'wink-naive-bayes-text-classifier'
import {
  Routes,
  Route,
  useParams
} from "@solidjs/router"
import Payment from './Payment'
import Contact from './Contact'
import NostrRelays from './NostrRelays'
import NostrKeys, { NostrKey } from './NostrKeys'
import Classifiers, {Classifier} from './Classifiers'
import TrainLabels from './TrainLabels'
import NostrPosts from './NostrPosts'
import Consortia from './Consortia'
import EncryptionKeys, { EncryptionKey } from './EncryptionKeys'
import defaultMetadata from './defaultMetadata'
import defaultCorsProxies from './defaultCorsProxies'
import defaultNostrRelays from './defaultNostrRelays'
import defaultNostrKeys from './defaultNostrKeys'
import defaultClassifiers from './defaultClassifiers'
import defaultTrainLabels from './defaultTrainLabels'
import defaultRSSFeeds from './defaultRSSFeeds'
import defaultConsortia from './defaultConsortia'
import defaultEncryptionKeys from './defaultEncryptionKeys'
import {
  DbFixture,
  TrainLabel,
  RSSFeed,
  CorsProxy,
  Consortium
} from "./db-fixture"
import { NostrRelay } from './NostrRelays'
import {
  prepNLPTask,
  createStoredSignal,
  applyPrediction,
  similarity,
  fetchNostrPosts,
  prePrepNostrPosts,
  prepNostrPost
} from './util'
import * as Y from 'yjs'
import * as buffer from 'buffer';
if (!window.Buffer) {
  window.Buffer = buffer.Buffer; 
}

const db = new DbFixture()
db.on("populate", () => {
  db.nostrkeys.bulkAdd(defaultNostrKeys as NostrKey[])
  db.nostrrelays.bulkAdd(defaultNostrRelays as NostrRelay[])
  db.rssfeeds.bulkAdd(defaultRSSFeeds as RSSFeed[])
  db.corsproxies.bulkAdd(defaultCorsProxies as CorsProxy[])
  db.trainlabels.bulkAdd(defaultTrainLabels as TrainLabel[])
  db.classifiers.bulkAdd(defaultClassifiers as Classifier[])
  db.consortia.bulkAdd(defaultConsortia as Consortium[])
  db.encryptionkeys.bulkAdd(defaultEncryptionKeys as EncryptionKey[])
})

const App: Component = () => {
  const [navIsOpen, setNavIsOpen] = createSignal(true)
  const [albyCodeVerifier, setAlbyCodeVerifier] = createStoredSignal('albyCodeVerifier', '')
  const [albyCode, setAlbyCode] = createStoredSignal('albyCode', '')
  const [processedPostsRoomId, setProcessedPostsRoomId] = createStoredSignal('processedPostsRoomId', '')
  const [albyTokenReadInvoice, setAlbyTokenReadInvoice] = createStoredSignal('albyTokenReadInvoice', '')
  const [selectedTrainLabel, setSelectedTrainLabel] = createStoredSignal('selectedTrainLabel', '')
  const [selectedMetadata, setSelectedMetadata] = createStoredSignal('selectedMetadata', {title:'', description:'', keywords: ''})

  const [prePrepedNostrPosts, setPrePrepedNostrPosts] = createSignal('')
  const [prepedNostrPosts, setPrepedNostrPosts] = createSignal('')
  const [dedupedNostrPosts, setDedupedNostrPosts] = createSignal('')
  const [scoredNostrPosts, setScoredNostrPosts] = createSignal('')
  const [nostrPosts, setNostrPosts] = createSignal('')
  const corsProxies = createDexieArrayQuery(() => db.corsproxies.toArray())
  const putCorsProxy = async (newCorsProxy: CorsProxy) => {
    await db.corsproxies.put(newCorsProxy)
  }
  const removeCorsProxy = async (corsProxyToRemove: CorsProxy) => {
    await db.corsproxies.where('id').equals(corsProxyToRemove?.id).delete()
  }
  
  const nostrRelays = createDexieArrayQuery(() => db.nostrrelays.toArray())
  const checkedNostrRelays = createDexieArrayQuery(() => db.nostrrelays
    .filter(relay => relay.checked === true)
    .toArray()
    )
  const putNostrRelay = async (newNostrRelay: NostrRelay) => {
    await db.nostrrelays.put(newNostrRelay)
  }
  const removeNostrRelay = async (nostrRelayToRemove: NostrRelay) => {
    await db.nostrrelays.where('id').equals(nostrRelayToRemove?.id).delete()
  }
  const nostrKeys = createDexieArrayQuery(() => db.nostrkeys.toArray())
  
  const npubsWithSecretKey = createDexieArrayQuery(() => db.nostrkeys
  .filter(nostrKey => !!nostrKey.secretKey)
  .toArray()
  )
  const putNostrKey = async (newKey: NostrKey) => {
    await db.nostrkeys.put(newKey)
  }
  const removeNostrKey = async (nostrKeyRemove: NostrKey) => {
    await db.nostrkeys.where('publicKey').equals(nostrKeyRemove.publicKey).delete()
  }

  const encryptionKeys = createDexieArrayQuery(() => db.encryptionkeys.toArray())
  const encryptionKeysWithSecretKey = createDexieArrayQuery(() => db.encryptionkeys
  .filter(encryptionKey => !!encryptionKey.secretKey)
  .toArray()
  )

  const putEncryptionKey = async (newKey: EncryptionKey) => {
    await db.encryptionkeys.put(newKey)
  }
  const removeEncryptionKey = async (encryptionKeyRemove: EncryptionKey) => {
    await db.encryptionkeys.where('publicKey').equals(encryptionKeyRemove.publicKey).delete()
  }

  const classifiers: Classifier[] = createDexieArrayQuery(() => db.classifiers.toArray())
  const putClassifier = async (newClassifierEntry: Classifier) => {
    const winkClassifier = WinkClassifier()
    winkClassifier.definePrepTasks( [ prepNLPTask ] )
    winkClassifier.defineConfig( { considerOnlyPresence: true, smoothingFactor: 0.5 } )
    if (newClassifierEntry.model != '') {
      winkClassifier.importJSON(newClassifierEntry.model)
    }
    if (newClassifierEntry.model === '' || newClassifierEntry?.id === undefined) {
      return
    }
    await db.classifiers.put(newClassifierEntry)
  }
  const trainLabels = createDexieArrayQuery(() => db.trainlabels.toArray())
  const checkedTrainLabels = createDexieArrayQuery(() => db.trainlabels
    .filter(label => label.checked === true)
    .toArray()
  )
  const removeClassifier = async (classifierToRemove: Classifier) => {
    await db.classifiers.where('id').equals(classifierToRemove?.id).delete()
  }
  createEffect(() => {
    const feedsForTrainLabel = checkedFeeds
      .filter((feed) => {
        return selectedTrainLabel() === '' || feed.trainLabels.indexOf(selectedTrainLabel()) !== -1
      })
      .map((feed: RSSFeed) => feed.id)
    const corsProxyList = checkedCorsProxies
      .map((corsProxy) => corsProxy.id)
    setFetchRssParams(JSON.stringify({
      feedsForTrainLabel: feedsForTrainLabel,
      corsProxies: corsProxyList
    }))
  })

  createEffect(() => {
    // @ts-ignore
    const newSelectedMetadata: {description: string, title:string, keywords: string} = defaultMetadata[`${selectedTrainLabel()}`] || {description: '', title:'cafe-society.news', keywords: ''}
    setSelectedMetadata(newSelectedMetadata)
  })
  createEffect(() => {
    if (fetchedNostrPosts() == '') {
      return
    }
    if (fetchedNostrPosts() == undefined) {
      return
    }
    prePrepNostrPosts(fetchedNostrPosts())
    .then(prePrepedNostrPosts => {
      setPrePrepedNostrPosts(JSON.stringify(prePrepedNostrPosts))
    })
  })
  createEffect(() => {
    if (prePrepedNostrPosts() === undefined) {
      return
    }
    if (prePrepedNostrPosts() === '') {
      return
    }
    const newPrepedNostrPosts = JSON.parse(prePrepedNostrPosts())
      .map((nostrPost: any) => prepNostrPost(nostrPost))
      .map((post: any) => {
        const shortmlText = post.mlText.split(' ').slice(0, 50).join(' ')
        const newPost = {
          ...post, 
          ...{ mlText: shortmlText}
        }
        return newPost
      })
    setPrepedNostrPosts(JSON.stringify(newPrepedNostrPosts))
  })

  createEffect(() => {
    if (prepedNostrPosts() == '') {
      return
    }
    const processedNostrPosts = yProcessedPosts.get('nostr') as string[]
    const newDedupedNostrPosts = JSON.parse(prepedNostrPosts()) && JSON.parse(prepedNostrPosts())
      .filter((nostrPost: any) => {
        return (nostrPost.mlText != '')
      })
      .filter((nostrPost: any) => {
        return [processedNostrPosts]
        .flat()?.indexOf(nostrPost.mlText) == -1
      })
      .filter((postItem: {mlText: string}) => {
        return ![processedNostrPosts].flat()?.find((processedPost) => {
          return similarity(
            `${processedPost}`,
            `${postItem.mlText}`
          )
        })
      })
    setDedupedNostrPosts(JSON.stringify(newDedupedNostrPosts))
  })

  createEffect(() => {
    if (dedupedNostrPosts() === undefined) {
      return
    }

    if (dedupedNostrPosts() == '') {
      return
    }
    const suppressOdds: number = parseFloat(classifiers.find((classifierEntry) => classifierEntry?.id == selectedTrainLabel())?.thresholdSuppressOdds || '999')
    const winkClassifier = WinkClassifier()
    winkClassifier.definePrepTasks( [ prepNLPTask ] )
    winkClassifier.defineConfig( { considerOnlyPresence: true, smoothingFactor: 0.5 } )
    const classifierModel: string = classifiers.find((classifierEntry: any) => classifierEntry?.id == selectedTrainLabel())?.model || ''
    if (classifierModel != '') {
      winkClassifier.importJSON(classifierModel)
    }
    const newScoredNostrPosts = (JSON.parse(dedupedNostrPosts()) && JSON.parse(dedupedNostrPosts()))
      .map((post: {
        prediction: any,
        classifier: any
      }) => applyPrediction({
        post: post,
        classifier: winkClassifier
      }))
      .sort((a: any, b: any) => (a.prediction.suppress > b.prediction.suppress) ? 1 : -1)
      .filter((post: {
        prediction: {
          promote: number
        }
      }) => {
        if (`${selectedTrainLabel}` == '') {
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
    setScoredNostrPosts(JSON.stringify(newScoredNostrPosts))
  })

  createEffect(() =>{
    if (scoredNostrPosts() === '') {
      return
    }
    if (scoredNostrPosts() === undefined) {
      return
    }
    const newNostrPosts = JSON.parse(scoredNostrPosts())
    setNostrPosts(newNostrPosts)
  })

  const putTrainLabel = async (newTrainLabel: TrainLabel) => {
    await db.trainlabels.put(newTrainLabel)
  }
  const removeTrainLabel = async (trainLabelToRemove: TrainLabel) => {
    await db.trainlabels.where('id').equals(trainLabelToRemove?.id).delete()
  }
  const rssFeeds = createDexieArrayQuery(() => db.rssfeeds.toArray())
  const putRSSFeed = async (newRSSFeed: RSSFeed) => {
    const newTrainLabels = newRSSFeed.trainLabels.slice()
    newRSSFeed.trainLabels = newTrainLabels
    await db.rssfeeds.put(newRSSFeed)
  }
  const removeRSSFeed = async (rssFeedToRemove: RSSFeed) => {
    await db.rssfeeds.where('id').equals(rssFeedToRemove?.id).delete()
  }

  const consortia = createDexieArrayQuery(() => db.consortia.toArray())
  const putConsortium = async (newConsortium: Consortium) => {
    if (newConsortium.label === '') {
      return
    }
    // trainLabels will turn into public keys/recipients
    // const newTrainLabels = newRSSFeed.trainLabels.slice()
    // newRSSFeed.trainLabels = newTrainLabels
    console.log(newConsortium)
    await db.consortia.put(newConsortium)
  }
  const removeConsortium = async (consortiumToRemove: Consortium) => {
    await db.consortia.where('label').equals(consortiumToRemove?.label).delete()
  }

  const checkedFeeds = createDexieArrayQuery(() => db.rssfeeds
    .filter(rssfeed => rssfeed.checked === true)
    .toArray())

  const checkedCorsProxies = createDexieArrayQuery(() => db.corsproxies
    .filter(corsProxy => corsProxy.checked === true)
    .toArray())

  const handleFeedToggleChecked = (id: string) => {
    const valuesForSelectedFeed = rssFeeds.find(feed => feed['id'] === id)
    const newValueObj = {
      ...valuesForSelectedFeed
      , checked: !valuesForSelectedFeed?.checked
    }
    putRSSFeed({...newValueObj} as RSSFeed)
  }

  const train = (params: {
    mlText: string,
    mlClass: string,
    trainLabel: string
  }) => {
    const oldModel: string = classifiers.find((classifierEntry) => classifierEntry?.id == params.trainLabel)?.model || ''
    const thresholdSuppressOdds: string = classifiers.find((classifierEntry) => classifierEntry?.id == params.trainLabel)?.thresholdSuppressOdds || '999'
    const winkClassifier = WinkClassifier()
    winkClassifier.definePrepTasks( [ prepNLPTask ] )
    winkClassifier.defineConfig( { considerOnlyPresence: true, smoothingFactor: 0.5 } )
    if (oldModel != '') {
      winkClassifier.importJSON(oldModel)
    }
    winkClassifier.learn(params.mlText, params.mlClass)
    const newModel: string = winkClassifier.exportJSON()
    const newClassifierEntry = {
      id: params.trainLabel,
      model: newModel,
      thresholdSuppressDocCount: '10',
      thresholdPromoteDocCount: '10',
      thresholdSuppressOdds: thresholdSuppressOdds
    }
    putClassifier(newClassifierEntry)
  }
  
  const [nostrQuery, setNostrQuery] = createSignal('')
  const [fetchRssParams, setFetchRssParams] = createSignal('')

  const ydocProcessedPosts = new Y.Doc()
  // const processedPostsWebRtcProvider = processedPostsRoomId() != '' ? new WebrtcProvider(processedPostsRoomId(), ydocProcessedPosts, { signaling: ['wss://fictionmachine.io/websocket'] }) : ''
  const processedPostsIndexeDBProvider = new IndexeddbPersistence('processedposts', ydocProcessedPosts)
  const yProcessedPosts = ydocProcessedPosts.getMap()

  yProcessedPosts.observeDeep(event => {
    // console.log(event)
  })

  const markComplete = (postId: string, feedId: string) => {
    const newProcessedPostsForFeed: string[] = yProcessedPosts.get(feedId) as string[] || []
    yProcessedPosts.set(feedId, Array.from(new Set([...newProcessedPostsForFeed, postId])))
  }

  const ignoreNostrKeys = createDexieArrayQuery(() => db.nostrkeys
    .filter(nostrKey => nostrKey.ignore === true)
    .toArray()
  )

  createEffect(() => {
    const nostrRelayList = checkedNostrRelays.map((relay: NostrRelay) => relay.id)
    const newQuery = JSON.stringify({
      'nostrRelayList': nostrRelayList,
      'ignore': ignoreNostrKeys,
    })
    setNostrQuery(newQuery)
  })

  const [fetchedNostrPosts] = createResource(nostrQuery, fetchNostrPosts)
  
  const toggleNav = () => setNavIsOpen(!navIsOpen())

  return (
    <main class="flex flex-row font-sans">
      <span>
        <Collapsible class="collapsible">
          <Collapsible.Trigger class="collapsible__trigger top-0px">
            <Button onClick={() => {}} label="➔" area-label="menu" class="align-center text-xl border-none collapsible__trigger-icon mt-8 color-green shadow-none"></Button>
          </Collapsible.Trigger>
          <Collapsible.Content class="collapsible__content">
          <span>
            <NavBar
                toggleNav={() => toggleNav()}
                setSelectedTrainLabel={(newLabel: string) => setSelectedTrainLabel(newLabel)}
                checkedTrainLabels={() => checkedTrainLabels}
              />
            </span>
          </Collapsible.Content>
        </Collapsible>
      </span>
      <span class="ml-4 mr4">        
          <Routes>
              <Route path='/cors' component={() => {
                const CorsProxies = lazy(() => import("./CorsProxies"))
                return <CorsProxies
                  corsProxies={corsProxies}
                  putCorsProxy={putCorsProxy}
                  removeCorsProxy={removeCorsProxy}
                />
              }} />
              <Route path='/alby' component={() => {
                const Profile = lazy(() => import("./Profile"))
                return <Profile
                  albyCodeVerifier={albyCodeVerifier}
                  setAlbyCodeVerifier={setAlbyCodeVerifier}
                  albyCode={albyCode}
                  setAlbyCode={setAlbyCode}
                  albyTokenReadInvoice={albyTokenReadInvoice}
                  setAlbyTokenReadInvoice={setAlbyTokenReadInvoice}
                  nPubOptions={npubsWithSecretKey}
                  setProcessedPostsRoomId={setProcessedPostsRoomId}
                  processedPostsRoomId={processedPostsRoomId}
                />
              }}/>
              <Route path='/rssfeeds' component={() => {
                const RSSFeeds = lazy(() => import("./RSSFeeds"))
                return <RSSFeeds
                  rssFeeds={rssFeeds}
                  consortia={consortia}
                  putFeed={putRSSFeed}
                  removeFeed={removeRSSFeed}
                  trainLabels={trainLabels}
                  handleFeedToggleChecked={(id: string) => handleFeedToggleChecked(id)}
                  
                />
              }}/>
              <Route path='/consortia' component={() => {
                const Consortia = lazy(() => import("./Consortia.tsx"))
                return <Consortia
                  consortia = {consortia}
                  nostrKeys = {nostrKeys}
                  encryptionKeys = {encryptionKeys}
                  putConsortium = {putConsortium}
                  removeConsortium = {removeConsortium}
                  nostrRelays = {checkedNostrRelays}
                />
              }}/>
              <Route path='/rssposts' component={() => {
                const RSSPosts = lazy(() => import("./RSSPosts"))
                return <RSSPosts
                  trainLabel={selectedTrainLabel() || ''}
                  metadata={selectedMetadata()}
                  setSelectedTrainLabel={setSelectedTrainLabel}
                  train={(params: {
                    mlText: string,
                    mlClass: string,
                    trainLabel: string
                  }) => {
                    train({
                      mlText: params.mlText,
                      mlClass: params.mlClass,
                      trainLabel: selectedTrainLabel() || '',
                    })
                  }}
                  markComplete={(postId: string, feedId: string) => markComplete(postId, feedId)}
                  fetchRssParams={fetchRssParams()}
                  classifiers={classifiers}
                  // rssPosts={dedupedRSSPosts() && JSON.parse(dedupedRSSPosts())}
                />
              }} />
              <Route path='/' component={() => {
                const RSSPosts = lazy(() => import("./RSSPosts"))
                return <RSSPosts
                  trainLabel=''
                  metadata={selectedMetadata()}
                  setSelectedTrainLabel={() => setSelectedTrainLabel('')}
                  train={(params: {
                    mlText: string,
                    mlClass: string,
                    trainLabel: string
                  }) => {
                    train({
                      mlText: params.mlText,
                      mlClass: params.mlClass,
                      trainLabel: ''
                    })
                  }}
                  markComplete={(postId: string, feedId: string) => markComplete(postId, feedId)}
                  fetchRssParams={fetchRssParams()}
                  classifiers={classifiers}
                  //rssPosts={dedupedRSSPosts() && JSON.parse(dedupedRSSPosts())}
                />
              }} />
              <Route path='/rssposts/:trainlabel' component={() => {
                const RSSPosts = lazy(() => import("./RSSPosts"))
                const {trainlabel} = useParams()
                return <RSSPosts
                  trainLabel={selectedTrainLabel() || ''}
                  metadata={selectedMetadata()}
                  train={(params: {
                    mlText: string,
                    mlClass: string,
                    trainLabel: string
                  }) => {
                    train({
                      mlText: params.mlText,
                      mlClass: params.mlClass,
                      trainLabel: selectedTrainLabel() || '',
                    })
                  }}
                  markComplete={(postId: string, feedId: string) => markComplete(postId, feedId)}
                  // rssPosts={scoredRSSPosts() && JSON.parse(scoredRSSPosts())}
                  setSelectedTrainLabel={setSelectedTrainLabel}
                  fetchRssParams={fetchRssParams()}
                  classifiers={classifiers}
                />
              }} />
              <Route path='/rssposts/:trainlabel/:model' component={() => {
                const RSSPosts = lazy(() => import("./RSSPosts"))
                const {trainlabel} = useParams()
                return <RSSPosts
                  trainLabel={selectedTrainLabel() || ''}
                  metadata={selectedMetadata()}
                  train={(params: {
                    mlText: string,
                    mlClass: string,
                    trainLabel: string
                  }) => {
                    train({
                      mlText: params.mlText,
                      mlClass: params.mlClass,
                      trainLabel: selectedTrainLabel() || '',
                    })
                  }}
                  markComplete={(postId: string, feedId: string) => markComplete(postId, feedId)}
                  fetchRssParams={fetchRssParams()}
                  classifiers={classifiers}
                  setSelectedTrainLabel={setSelectedTrainLabel}
                />
              }} />
              <Route 
                path='/nostrposts'
                component={() => {
                  return (
                    <NostrPosts
                      selectedTrainLabel='nostr'
                      train={(params: 
                        {
                          mlText: string,
                          mlClass: string,
                          trainLabel: string
                        }) => {
                      train({
                        mlText: params.mlText,
                        mlClass: params.mlClass,
                        trainLabel: 'nostr',
                        })
                      }}
                      nostrPosts={nostrPosts}
                      putNostrKey={putNostrKey}
                      putClassifier={putClassifier}
                      markComplete={(postId: string) => markComplete(postId, 'nostr')}
                    />
                  )
                }}
              />
              <Route path='/contact' component={() => <Contact/>}/>
              <Route path='/consortia' component={() => <Consortia 
                consortia={consortia}
                nostrKeys={nostrKeys}
                encryptionKeys={encryptionKeys}
                nostrRelays={nostrRelays}
                // nostrMessageKind={nostrMessageKind}
                putConsortium={putConsortium}
                removeConsortium={removeConsortium}
                />} />
              <Route path='/subscriptions' component={() => <Payment />} />
              <Route path='/nostrrelays' component={() => {
                return <NostrRelays
                  nostrRelays={nostrRelays}
                  putNostrRelay={putNostrRelay}
                  removeNostrRelay={removeNostrRelay}
                  />
              }} />
              <Route path='/nostrkeys' component={() => {
                return <NostrKeys
                  nostrKeys={nostrKeys}
                  putNostrKey={putNostrKey}
                  removeNostrKey={removeNostrKey}
                  />}} />
              <Route path='/nostrkeys/raw' component={() => <pre>{JSON.stringify(nostrKeys, null, 2)}</pre>}/>
              <Route path='/encryptionkeys' component={() => {
                return <EncryptionKeys
                  encryptionKeys={encryptionKeys}
                  putEncryptionKey={putEncryptionKey}
                  removeEncryptionKey={removeEncryptionKey}
                  />}} />
              <Route path='/encryptionkeys/raw' component={() => <pre>{JSON.stringify(encryptionKeys, null, 2)}</pre>}/>
              
              <Route path='/classifiers' component={() => {
                return <Classifiers
                  classifiers={classifiers}
                  putClassifier={putClassifier}
                  removeClassifier={removeClassifier}
                  />}}
              />
              <Route path='/classifiers/:trainLabel' component={() => {
                return <Classifiers
                  classifiers={classifiers}
                  putClassifier={putClassifier}
                  removeClassifier={removeClassifier}
                  />}}
              />
              <Route path='/classifiers/raw' component={() => {
                return <pre>
                  {JSON.stringify(classifiers, null, 2)}
                  </pre>
                }}/>
              <Route path='/trainlabels' component={() => {
                return <TrainLabels
                  trainLabels={trainLabels}
                  putTrainLabel={putTrainLabel}
                  removeTrainLabel={removeTrainLabel}
                  />}} />
            </Routes>
      </span>
    </main>
  )
}
export default App