import {
  Separator,
  Button
} from "@kobalte/core";

import { For } from 'solid-js'
import {
  createFormGroup,
  createFormControl,
} from "solid-forms";
import { TextInput } from './components/TextInput'
import { PageHeader } from './components/PageHeader'
import {
  VsTrash
} from 'solid-icons/vs'

const CorsProxies = (props: {
    corsProxies: CorsProxy[],
    // eslint-disable-next-line no-unused-vars
    putCorsProxy: (corsProxy: CorsProxy) => void,
    // eslint-disable-next-line no-unused-vars
    removeCorsProxy: (corsProxy: CorsProxy) => void
  }) => {
  const group = createFormGroup({
    id: createFormControl(""),
    checked: createFormControl(true)
  });

  const onSubmit = async (event: any) => {
    event.preventDefault()
    if (group.isSubmitted) {
      // console.log('already submitted')
      return;
    }
    [Object.fromEntries(
      Object.entries(Object.assign({
        id:'',
        checked:true
      }, group.value))
      .filter(([, value]) => `${value}` !== '')
    )]
    .forEach(newCorsProxy => {
      const newCorsProxyObj: CorsProxy = {
        ...{
          id: '',
          checked: true
        },
        ...newCorsProxy
      }
      props.putCorsProxy(newCorsProxyObj)
    })

    group.setValue({
      id:'',
      checked:true
    })
  };

  // const handleToggleChecked = (id: string) => {
  //   const valuesForSelectedFeed = props.corsProxies
  //   .find(corsProxyEdit => corsProxyEdit['id'] === id)
  //   const newValueObj = (Object.assign(
  //     {
  //       ...valuesForSelectedFeed
  //     },
  //     {checked: !group.value.checked}
  //   ))
  //   group.setValue (newValueObj)
  //   props.putCorsProxy(newValueObj)
  //   return
  // }

  return (
    <div>
      <PageHeader>Cors Proxies</PageHeader>
      <Separator.Root />
      <main>
        <div>
          <form onSubmit={onSubmit}>
            <label for="id">URL</label>
            <TextInput name="id" control={group.controls.id} />
          </form>
        </div>
        <div>
          <h4 class="text-muted">Cors Proxies:</h4>
          <For each={props.corsProxies}>
            {(corsProxy) => (
              <div class='w-full flex flex-row justify-start m-1'>
                <Button.Root
                  onClick={() => props.removeCorsProxy(corsProxy)}
                  class='bg-transparent hover-bg-slate-900 hover-text-white border-none rounded-full'
                >
                  <VsTrash class='hover-text-white' />
                </Button.Root>
                <section class='m-1'>{corsProxy.id}</section>
              </div>
            )}
          </For>
        </div>
      </main>
    </div>
  )
}
export default CorsProxies;
export interface CorsProxy {
  "id": string,
  "checked": boolean
  }