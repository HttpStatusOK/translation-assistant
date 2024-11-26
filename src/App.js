import TextArea from "antd/es/input/TextArea";
import {Alert, Divider, Space, Spin, Typography} from "antd";
import {useEffect, useState} from "react";
import {useSearchParams} from 'react-router-dom';
import {isMobile} from 'react-device-detect';

const API_PATH = "/v1/chat/completions";
const SIMPLE_PROMPT = `
## 主要任务

你是一位资深且专业的翻译员，具备出色的翻译能力，你的任务是能精准且流畅地将各类文本翻译成中文和英文，并且附带音标标注。

## 规则

- 翻译时要准确传达原文的事实和背景。
- 理解用户输入的文本，确保符合语言习惯，你可以调整语气和风格，并考虑到某些词语的文化内涵和地区差异。
- 同时作为翻译家，需将原文翻译成具有信达雅标准的译文。
- "信" 即忠实于原文的内容与意图；
- "达" 意味着译文应通顺易懂，表达清晰；
- "雅" 则追求译文的文化审美和语言的优美。目标是创作出既忠于原作精神，又符合目标语言文化和读者审美的翻译。

## 注意事项

- 音标需要使用 DJ 音标（Daniel Jones，亦即英式音标），这里是所有常见的 DJ 音标美式发音符号，以空格分隔：iː ɪ e æ ɑː ɒ ɔː ʊ uː ʌ ɜːr ər eɪ aɪ oʊ aʊ ɔɪ p b t d k ɡ tʃ dʒ f v θ ð s z ʃ ʒ h m n ŋ l r j w

## 输出格式

如果输入文本是中文，则返回：
{英语译文}\\n{对应的音标}

如果输入文本是非中文，则返回：
{中文译文}\\n{英语译文}\\n{对应的音标}

## 初始化

我已准备好接收您需要翻译的文本。请直接粘贴或输入，我将以一个资深且专业的翻译员身份翻译这段文本。
`

function App() {
  const [searchParams] = useSearchParams();

  const [apiDomain] = useState(searchParams.get("apiDomain") || null);
  const [apiKey] = useState(searchParams.get("apiKey") || null);

  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  const [timeoutId, setTimeoutId] = useState(0);

  const handleInputChange = (event) => {
    const { value } = event.target;
    setInputValue(value.replaceAll("\n", ""));

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (!value) {
      setResult(null);
      return;
    }

    const id = setTimeout(() => {
      fetchData(value);
    }, 1000);

    setTimeoutId(id);
  };


  const fetchData = (value) => {
    setLoading(true);
    const body = {
      model: "gpt-4o-2024-11-20",
      messages: [
        {
          role: "system",
          content: SIMPLE_PROMPT
        },
        {
          role: "user",
          content: value || inputValue
        },
      ]
    }

    fetch(`${apiDomain}${API_PATH}`, { method: "POST", headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify(body)})
      .then(res => res.json())
      .then(res => {
        if (!inputValue && !value) {
          return;
        }

        const text = res.choices[0].message.content;
        setResult(text);
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  return (
    <div>
      <div style={{maxWidth: 600, margin: "auto", padding: "0 20px"}}>
        <div>
          <Header/>
          {!apiKey &&
            <div style={{padding: "20px 0"}}>
              <Alert
                message="开始之前需要先配置 ApiDomain 及 ApiKey"
                type="warning"
              />
            </div>}
          <TextArea
            style={{paddingTop: 50}}
            variant="borderless"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="这是一个带音标标注的翻译工具，点击开始翻译吧"
            autoSize={{
              minRows: 1,
              maxRows: 5,
            }}
          />
          <Divider orientation="right"/>
          <SimpleComponent result={result} loading={loading}/>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{minHeight: 80}}></div>
          <PhoneticSymbols/>
        </div>
      </div>
    </div>
  );
}

const Header = () => {
  return (
    <>
      <Typography.Title level={2} style={{ marginBottom: 0 }}>Translation Assistant</Typography.Title>
      <Typography.Text italic type={"secondary"}>Created by&nbsp;
        <Typography.Link
          target={"_blank"}
          href={"https://github.com/HttpStatusOK"}
          underline
          italic
          style={{ color: "#898989" }}
        >
          Edison
        </Typography.Link>.&nbsp;
      </Typography.Text>
      <Typography.Text italic type={"secondary"}>View&nbsp;
        <Typography.Link
          target={"_blank"}
          href={"https://github.com/HttpStatusOK/translation-assistant"}
          underline
          italic
          style={{ color: "#898989" }}
        >
          source code
        </Typography.Link>.&nbsp;
        <Typography.Text italic type={"secondary"}>Based on OpenAI development.</Typography.Text>
      </Typography.Text>
    </>
  )
}

const SimpleComponent = ({ result, loading }) => {
  return (
    <Spin spinning={loading}>
      <TextArea
        readOnly
        variant="borderless"
        value={`${result || ""}`}
        autoSize={{}}
        placeholder={`This is a translation tool with phonetic transcription; click to start translating.\n/ðɪs ɪz ə ˈtrænsleɪʃən tuːl wɪð fəˈnɛtɪk ˈtrænskrɪpʃən; klɪk tə stɑːt ˈtrænzˌleɪtɪŋ/`}
      />
    </Spin>
  )
}

const PhoneticSymbols = () => {
  return (
    <>
      <Space size={isMobile ? 20 : 60} align={"start"}>

        <Space direction="vertical" size={1} align={"start"}>
          <Typography.Text strong>Monophthongs</Typography.Text>
          <Typography.Text>[ɑː] - class</Typography.Text>
          <Typography.Text>[ʌ] - cup</Typography.Text>
          <div style={{minHeight: 6}}></div>
          <Typography.Text>[ɔː] - door</Typography.Text>
          <Typography.Text>[ɒ] - hot</Typography.Text>
          <div style={{minHeight: 6}}></div>
          <Typography.Text>[ə] - above</Typography.Text>
          <Typography.Text>[ɜː] - bird</Typography.Text>
          <div style={{minHeight: 6}}></div>
          <Typography.Text>[iː] - see</Typography.Text>
          <Typography.Text>[ɪ] - bit</Typography.Text>
          <div style={{minHeight: 6}}></div>
          <Typography.Text>[uː] - food</Typography.Text>
          <Typography.Text>[ʊ] - put</Typography.Text>
          <div style={{minHeight: 6}}></div>
          <Typography.Text>[e] - bed</Typography.Text>
          <Typography.Text>[æ] - at</Typography.Text>
        </Space>

        <Space direction="vertical" size={1} align={"start"}>
          <Typography.Text strong>Diphthong</Typography.Text>
          <Typography.Text>[eɪ] - day</Typography.Text>
          <Typography.Text>[aɪ] - boy</Typography.Text>
          <Typography.Text>[ɔɪ] - why</Typography.Text>
          <div style={{minHeight: 6}}></div>
          <Typography.Text>[aʊ] - old</Typography.Text>
          <Typography.Text>[əʊ] - how</Typography.Text>
          <div style={{minHeight: 6}}></div>
          <Typography.Text>[ɪə] - hear</Typography.Text>
          <Typography.Text>[ʊə] - tour</Typography.Text>
          <Typography.Text>[eə] - hair</Typography.Text>
        </Space>

        <Space direction="vertical" size={1} align={"start"}>
          <Typography.Text strong>Consonant</Typography.Text>
          <Space align={"start"} size={"middle"}>
            <Space direction="vertical" size={1} align={"start"}>
              <Typography.Text>[p] - pat</Typography.Text>
              <Typography.Text>[b] - bat</Typography.Text>
              <Typography.Text>[t] - top</Typography.Text>
              <Typography.Text>[d] - dog</Typography.Text>
              <Typography.Text>[k] - cat</Typography.Text>
              <Typography.Text>[g] - go</Typography.Text>
              <Typography.Text>[tʃ] - watch</Typography.Text>
              <Typography.Text>[dʒ] - just</Typography.Text>
              <Typography.Text>[f] - fan</Typography.Text>
              <Typography.Text>[v] - van</Typography.Text>
              <Typography.Text>[θ] - think</Typography.Text>
              <Typography.Text>[ð] - this</Typography.Text>
              <Typography.Text>[s] - see</Typography.Text>
              <Typography.Text>[z] - zoo</Typography.Text>
            </Space>

            <Space direction="vertical" size={1} align={"start"}>
              <Typography.Text>[ʃ] - she</Typography.Text>
              <Typography.Text>[ʒ] - usually</Typography.Text>
              <Typography.Text>[h] - hat</Typography.Text>
              <Typography.Text>[m] - man</Typography.Text>
              <Typography.Text>[n] - no</Typography.Text>
              <Typography.Text>[ŋ] - sing</Typography.Text>
              <Typography.Text>[l] - lip</Typography.Text>
              <Typography.Text>[r] - run</Typography.Text>
              <Typography.Text>[j] - yes</Typography.Text>
              <Typography.Text>[w] - we</Typography.Text>
            </Space>
          </Space>
        </Space>
      </Space>
    </>
  )
}

export default App;
