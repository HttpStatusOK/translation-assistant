import TextArea from "antd/es/input/TextArea";
import {Alert, Button, Divider, message, Space, Spin, Tooltip, Typography} from "antd";
import {useEffect, useRef, useState} from "react";
import {useSearchParams} from 'react-router-dom';
import {isMobile} from 'react-device-detect';
import {SoundOutlined} from "@ant-design/icons";

const API_PATH = "/v1/chat/completions";
const ASSISTANT_PROMPT = `
## 主要任务

我是一条资深且专业的翻译API，具备出色的翻译能力，我的任务是能精准且流畅地将各类文本翻译成中文和英文，并且附带音标标注。

## 规则

- 翻译时要准确传达原文的事实和背景。
- 理解用户输入的文本，确保符合语言习惯，你可以调整语气和风格，并考虑到某些词语的文化内涵和地区差异。
- 同时作为翻译家，需将原文翻译成具有信达雅标准的译文。
- "信" 即忠实于原文的内容与意图；
- "达" 意味着译文应通顺易懂，表达清晰；
- "雅" 则追求译文的文化审美和语言的优美。目标是创作出既忠于原作精神，又符合目标语言文化和读者审美的翻译。

## 注意事项

- 音标需要使用DJ音标，以下是所有音标：iː ɪ e æ ɑː ɒ ɔː ʊ uː ʌ ɜːr ər eɪ aɪ oʊ aʊ ɔɪ p b t d k ɡ tʃ dʒ f v θ ð s z ʃ ʒ h m n ŋ l r j w，如果你返回的音标不在其中，那一定是版本没用对，请检查是否符合版本要求。

## 输出格式

我需要返回 JSON 格式數據，例如，當用户問我：what is tesla：


我應返回：
{
  a: "特斯拉是什么" // a 表示中文译文，如果输入的是中文，则返回 null
  b: [ // b 表示英文译文，无论
    { w: "What", p: "ˈwɒt", z: "什么" }, // w表示单词，p表示该单词的音标，z表示该单词的中文译文
    { w: "is", p: "ɪz", z: "是" },
    { w: "Tesla", p: "ˈteslə", z: "特斯拉" },
    { w: "?", p: "?" } // 标点符号也需要一个对象，p同样要返回标点符号
  ]
}


注意，请将json压缩后再返回。不要加上任务格式，我只需要返回能被解析的json，如果遇到我无法翻译的，直接返回-1

## 初始化

我已准备好接收您需要翻译的文本。请直接粘贴或输入，我将以一个资深且专业的翻译API身份翻译这段文本。
`

function App() {
  const [searchParams] = useSearchParams();

  const [apiDomain] = useState(searchParams.get("apiDomain") || null);
  const [apiKey] = useState(searchParams.get("apiKey") || null);

  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  const [resultJSON, setResultJSON] = useState(null);

  const [timeoutId, setTimeoutId] = useState(0);

  const handleInputChange = (event) => {
    const { value } = event.target;
    setInputValue(value);

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (!value) {
      setResultJSON(null);
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
          content: ASSISTANT_PROMPT
        },
        {
          role: "user",
          content: value || inputValue
        },
      ]
    }

    const config = {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Api-Key": `${apiKey}`
      },
      body: JSON.stringify(body)
    }

    fetch(`${apiDomain}${API_PATH}`, config)
      .then(res => res.json())
      .then(res => {
        if (!inputValue && !value) {
          return;
        }

        try {
          const text = res.choices[0].message.content;
          setResultJSON(JSON.parse(text));
        } catch (e) {
          message.warning(`该文本暂时无法翻译`)
        }

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
          <TranslationDisplay data={resultJSON} loading={loading} />
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{minHeight: 80}}></div>
          <PhoneticSymbols />
        </div>
      </div>
    </div>
  );
}

const Header = () => {
  return (
    <div style={{ textAlign: "center" }}>
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
    </div>
  )
}

const TranslationDisplay = ({ data, loading }) => {
  const [highLightId, setHighLightId] = useState(null);

  const audioRef = useRef(null);

  const recitation = (word) => {
    audioRef.current.src = `https://dict.youdao.com/dictvoice?audio=${word}&type=2`
    audioRef.current.play();
  }

  return (
    <div style={{ padding: "0 11px" }}>
      <Spin spinning={loading}>
        {data && data.a && <Typography.Text>{data.a}</Typography.Text>}
        <div style={{minHeight: 10}}></div>
        <audio ref={audioRef} preload="auto"/>
        {data && data.b &&
          <Space wrap size={[4, 10]}>
            {data.b.map((item, idx) => (
              <Tooltip title={item.z} key={idx}>
                <div
                  style={{cursor: "pointer"}}
                  onClick={() => recitation(item.w)}
                  onMouseEnter={() => {
                    setHighLightId(idx)
                  }}
                  onMouseLeave={() => {
                    setHighLightId(null)
                  }}
                >
                  <Typography.Text mark={highLightId === idx}> {item.w}</Typography.Text>
                  <br/>
                  <Typography.Text style={{lineHeight: 0}} type={"secondary"}
                                   mark={highLightId === idx}> {item.p}</Typography.Text>
                </div>
              </Tooltip>
            ))}
            <Button
              style={{marginLeft: 10}}
              icon={<SoundOutlined/>}
              size={"small"}
              onClick={() => {
                let text = "";
                const arr = data.b;
                for (let i = 0; i < arr.length; i++) {
                  text += `${arr[i].w} `;
                }
                if (text) {
                  recitation(text);
                }
              }}
            />
          </Space>}
      </Spin>
    </div>
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
