import {
  createFilter,
  Combobox
} from "@kobalte/core";
import { PageHeader } from './components/PageHeader'
import {
  For,
  createSignal,
  Show
} from 'solid-js';
import {
  createFormGroup,
  createFormControl,
} from "solid-forms";
import { TextInput } from './components/TextInput'
import { FaSolidCheck  as CheckIcon} from 'solid-icons/fa'
import { Button } from './components/Button'
import { NostrKey } from './NostrKeys'
import { NostrRelay } from './NostrRelays'
import { EncryptionKey } from './EncryptionKeys'
import {
  generatePrivateKey,
  getPublicKey,
  nip19
} from 'nostr-tools'
import NDK, {
  NDKPrivateKeySigner
} from '@nostr-dev-kit/ndk'

import {
  createNostrCRDTRoom
} from 'y-ndk'

import * as yjs from 'yjs'

type Consortium = any

const Consortia = (props: {
    consortia: any;
    nostrKeys: NostrKey[];
    encryptionKeys: EncryptionKey[];
    nostrRelays: NostrRelay[];
    nostrMessageKind: string;
    // eslint-disable-next-line no-unused-vars
    putConsortium: (consortium?: Consortium) => void,
    // eslint-disable-next-line no-unused-vars
    removeConsortium: (consortium?: Consortium) => void
  }) => {
    // const [trainLabelValues, setTrainLabelValues] = createSignal([]);
  const [signerNpub, setSignerNpub] = createSignal('');
  const [memberPublicKeys, setMemberPublicKeys] =  createSignal([])
  const filter = createFilter({ sensitivity: "base" });
  const [optionsEncryptionKeys, setOptionsEncryptionKeys] = createSignal<string[]>([]);
  const [optionsNpub, setOptionsNpub] = createSignal<string[]>([]);

  const getNostrMessageKind = () => parseInt(props.nostrMessageKind)

//   const onOpenChange = (isOpen: boolean, triggerMode?: Combobox.ComboboxTriggerMode) => {
//     // Show all options on ArrowDown/ArrowUp and button click.
//     if (isOpen && triggerMode === "manual") {
//       setOptions(props.trainLabels.map(trainLabel => trainLabel.id));
//     }
//   };
//   const onInputChange = (value: string) => {
//     setOptions(options()?.filter(option => filter.contains(option, value)));
//   };

  const onOpenChangeNpub = (isOpen: boolean, triggerMode?: Combobox.ComboboxTriggerMode) => {
    // Show all options on ArrowDown/ArrowUp and button click.
    if (isOpen && triggerMode === "manual") {
      setOptionsNpub(props.nostrKeys.map(nostrKey => nostrKey.publicKey))
      // console.log(optionsNpub)
    }
  };
  const onInputChangeNpub = (value: string) => {
    setOptionsNpub(optionsNpub()?.filter(option => !filter.contains(option, value)));
  };

  const onOpenChangeEncryptionKeys = (isOpen: boolean, triggerMode?: Combobox.ComboboxTriggerMode) => {
    // Show all options on ArrowDown/ArrowUp and button click.
    if (isOpen && triggerMode === "manual") {
      setOptionsEncryptionKeys(props.encryptionKeys.map(encryptionKey => encryptionKey.label || encryptionKey.publicKey))
    }
  };
  const onInputChangeEncryptionKeys = (value: string) => {
    setOptionsEncryptionKeys(optionsEncryptionKeys()?.filter(option => filter.contains(option, value)));
  };



  const group = createFormGroup({
    id: createFormControl(''),
    label: createFormControl(''),
    signerNpub: createFormControl(''),
    nostrMessageKind: createFormControl(''),
    memberPublicKeys: createFormControl([''])
    
  });

  const onSubmit = async (event?: Event ) => {
    const consortiumTemplate = {
      "id": "",
      "label": "",
      "signerNpub": "",
      "nostrMessageKind": "",
      "memberPublicKeys": [""]
      
    }
    try {
      event?.preventDefault()
    } catch (err) {
      //pass
    }
    if (group.isSubmitted) {
      console.log('already submitted')
      return;
    }
    const { id } = group.value
    if (!id) {
      return
    }
    [Object.fromEntries(
      Object.entries(Object.assign({
        ...consortiumTemplate
      }, group.value))
      .filter(([, value]) => `${value}` !== '')
    )]
    .forEach(newConsortium => {
      const newConsortiumObj: Consortium = {
        ...consortiumTemplate,
        ...newConsortium
      }
      newConsortiumObj.signerNpub = signerNpub()
      if (newConsortiumObj.label === '') {
        return
      }
      newConsortiumObj.memberPublicKeys = memberPublicKeys()

      props.putConsortium(newConsortiumObj)
    })
    group.setValue(consortiumTemplate)
    setSignerNpub('')
    setMemberPublicKeys([])
  };

  const handleClickConsortium = (label: string) => {
    // setTrainLabelValues([])
    setOptionsNpub([])
    setSignerNpub('')
    setOptionsEncryptionKeys([])
    const valuesForSelectedConsortium = props.consortia
      .find((consortiumEdit: any) => consortiumEdit['label'] === label)
    group.setValue(Object.assign({
        id: '',
        label: '',
        signerNpub: '',
        memberPublicKeys: []
      }, valuesForSelectedConsortium))
    // setTrainLabelValues(valuesForSelectedFeed?.trainLabels as string[] || [''])
    setSignerNpub(valuesForSelectedConsortium?.signerNpub as string || '')
    setMemberPublicKeys(valuesForSelectedConsortium?.memberPublicKeys)
  }
  const handleClickCreateRoom = async () => {
    const signerNSec = props.nostrKeys.find(nostrKey => {
      return nostrKey.label || nostrKey.publicKey === signerNpub() 
    })?.secretKey
    if (!signerNSec) {
      return
    }
    const {
      type,
      data
    } = nip19.decode(signerNSec)
    const theData = data
    const skSigner = new NDKPrivateKeySigner(data)
    const theUser = await skSigner.user()
    let ndkOpts = {
      signer: null,
      explicitRelayUrls: [''],
      activeUser: null
    }
    ndkOpts.signer = skSigner
    ndkOpts.explicitRelayUrls = props.nostrRelays.map((nostrRelay => nostrRelay.id))
    ndkOpts.activeUser = skSigner.user()
    const roomNdk = new NDK(ndkOpts)
    await roomNdk.connect()
    // const receivers = getReceiverPublicKeys()
    const ydoc = new yjs.Doc()
    const initialLocalState = yjs.encodeStateAsUpdate(ydoc)
    // const encrypt = input => privatebox.multibox(new Uint8Array(input), receivers)
    const encrypt = (input: string) => input
    const nostrCRDTCreateEventId = await createNostrCRDTRoom(
        roomNdk,
        'testWebApp',
        initialLocalState,
        getNostrMessageKind(),
        encrypt
    )
    group.patchValue({id: `${nostrCRDTCreateEventId}`});
  }

  return (
    <>
      <PageHeader>Consortia</PageHeader>
      <form onSubmit={onSubmit}>
        <label>Nostr Room Event ID
          <TextInput testid="consortium-id" name="consortium-id" control={group.controls.id} />
        </label>
        <label>Label
          <TextInput name="label" control={group.controls.label} />
        </label>
        <Button
          onClick={(event: Event) => {
            event.preventDefault
            handleClickCreateRoom()
            return false
          }}
         label="new nostr room"
        />
      <Combobox.Root<string>
        multiple={false}
        options={props.nostrKeys.map(nostrKey => nostrKey.label || nostrKey.publicKey)}
        value={signerNpub()}
        onChange={setSignerNpub}
        onInputChange={onInputChangeNpub}
        onOpenChange={onOpenChangeNpub}
        placeholder="click label to remove..."
        itemComponent={props => (
          <Combobox.Item item={props.item} class='combobox__item w-200px'>
            <Combobox.ItemLabel>{props.item.rawValue}</Combobox.ItemLabel>
            <Combobox.ItemIndicator class="combobox__item-indicator">
              <CheckIcon />
            </Combobox.ItemIndicator>
          </Combobox.Item>
        )}
      >
        <Combobox.Control<string> 
          aria-label="nPub"
          class="combobox__control" 
        >
        {state => (
          <> 
            <Combobox.Trigger class='border-none bg-transparent align-middle text-3xl transition-all hover-text-white hover:bg-black rounded-full'>
              &nbsp;signer npub&nbsp;
            </Combobox.Trigger>
            <div class='flex flex-row bg-white '>
              <For each={state.selectedOptions()}>
                {option => {
                  let nostrSecretKey = generatePrivateKey()
                  const npub = nip19.npubEncode(getPublicKey(nostrSecretKey))
                  return (<div class='align-bottom flex flex-row' onPointerDown={e => e.stopPropagation()}>
                    <Button
                      title={`remove ${option}`}
                      onClick={() => {
                        state.remove(option)
                      }}
                      label={option}
                      
                    />
                  </div>
                )}}
              </For>
            </div>
          </>
        )}
      </Combobox.Control>
      <Combobox.Portal>
        <Combobox.Content class="combobox__content">
          <Combobox.Listbox class="combobox__listbox font-sans"/>
        </Combobox.Content>
      </Combobox.Portal>
      </Combobox.Root>

      <div />

      <Combobox.Root<string[]>
        multiple={true}
        options={props.encryptionKeys.map((encryptionKey: {label?: string, publicKey: string}) => encryptionKey.label || encryptionKey.publicKey)}
        value={memberPublicKeys()}
        onChange={setMemberPublicKeys}
        onInputChange={onInputChangeEncryptionKeys}
        onOpenChange={onOpenChangeEncryptionKeys}
        placeholder="click label to remove..."
        itemComponent={props => (
          <Combobox.Item item={props.item} class='combobox__item w-200px'>
            <Combobox.ItemLabel>{props.item.rawValue}</Combobox.ItemLabel>
            <Combobox.ItemIndicator class="combobox__item-indicator">
              <CheckIcon />
            </Combobox.ItemIndicator>
          </Combobox.Item>
        )}
      >
        <Combobox.Control<string> 
          aria-label="nPub"
          class="combobox__control" 
        >
        {state => (
          <> 
            <Combobox.Trigger class='border-none bg-transparent align-middle text-3xl transition-all hover-text-white hover:bg-black rounded-full'>
              &nbsp;member public keys&nbsp;
            </Combobox.Trigger>
            <div>
              <For each={state.selectedOptions()}>
                {option => {
                  return (<div class='align-bottom flex flex-row' onPointerDown={e => e.stopPropagation()}>
                    <Button
                      title={`remove ${option}`}
                      onClick={() => {
                        state.remove(option)
                      }}
                      label={option}
                    />
                  </div>
                )}}
              </For>
            </div>
          </>
        )}
      </Combobox.Control>
      <Combobox.Portal>
        <Combobox.Content class="combobox__content">
          <Combobox.Listbox class="combobox__listbox font-sans"/>
        </Combobox.Content>
      </Combobox.Portal>
      </Combobox.Root>
      
      <Button
        title='submit'
        label='submit'
        onClick={() => {
          onSubmit()
        }}
        />
      </form>
      <strong style={{'font-size': 'large'}}>Consortia:</strong>
      <div class='h-50 overflow-y-auto'>
        <For each={props.consortia}>
            {(consortium) => (
              <Show when={`${consortium?.label}` != ''}>
                <div class='flex justify-between'>
                  <div class="flex justify-start">
                    <div class="flex justify-start">
                      <Button
                        class='text-base pt-0 mt-0'
                        onClick={() => handleClickConsortium(consortium?.label)}
                        label={consortium?.label}
                      />
                    </div>
                    <Button 
                      title={`remove ${consortium.label}`}
                      onClick={() => props.removeConsortium(consortium)}
                      label='✕'
                    />
                    {/* <Switch 
                      label=''
                      class="flex display-inline pt-2"
                      checked={feed.checked}
                      onChange={() => handleToggleChecked(`${feed.id}`, !feed.checked)}
                    /> */}
                  </div>
                </div>
              </Show>
            )}
        </For>
      </div>
    </>
  );
}
export default Consortia
