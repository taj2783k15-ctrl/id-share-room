import { useState } from 'react'
import {
  CAPACITY_OPTIONS,
  getNicknameError,
  getPassphraseError,
  getCapacityError,
} from '../lib/validation.js'
import { useFormSubmit } from '../hooks/useFormSubmit.js'
import {
  FieldError,
  NicknameInput,
  PassphraseInput,
} from '../components/FormFields.jsx'

// ルーム作成画面
// onCreate({ nickname, passphrase, capacity }) が失敗したらエラーを表示する
function CreateRoomScreen({ onBack, onCreate }) {
  const [nickname, setNickname] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [capacity, setCapacity] = useState(CAPACITY_OPTIONS[0])
  const { submitted, submitting, serverError, submit } =
    useFormSubmit(onCreate)

  const nicknameError = getNicknameError(nickname)
  const passphraseError = getPassphraseError(passphrase)
  const capacityError = getCapacityError(capacity)

  const handleSubmit = () =>
    submit(Boolean(nicknameError || passphraseError || capacityError), {
      nickname,
      passphrase,
      capacity,
    })

  return (
    <div className="menu-screen">
      <h1>ルームを作る</h1>

      <div className="form">
        <div className="form-row">
          <label htmlFor="create-nickname">ニックネーム</label>

          <NicknameInput
            id="create-nickname"
            value={nickname}
            onChange={setNickname}
            error={submitted || nickname ? nicknameError : ''}
          />
        </div>

        <div className="form-row">
          <label htmlFor="create-passphrase">合言葉</label>

          <PassphraseInput
            id="create-passphrase"
            value={passphrase}
            onChange={setPassphrase}
            error={submitted ? passphraseError : ''}
          />
        </div>

        <div className="form-row">
          <label htmlFor="create-capacity">定員（ホストを含む）</label>

          <select
            id="create-capacity"
            className="form-input"
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
          >
            {CAPACITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}人（参加者{option - 1}人まで）
              </option>
            ))}
          </select>

          <FieldError message={capacityError} />
        </div>

        <FieldError message={serverError} />

        <div className="menu-buttons">
          <button
            className="menu-button primary"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? '作成中…' : '作成する'}
          </button>

          <button className="menu-button" onClick={onBack}>
            戻る
          </button>
        </div>
      </div>
    </div>
  )
}

export default CreateRoomScreen
