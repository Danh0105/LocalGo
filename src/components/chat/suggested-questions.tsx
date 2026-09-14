import { Icon } from "zmp-ui";

type SuggestedQuestionsProps = {
  questions: string[];
  disabled?: boolean;
  label?: string;
  onSelect: (question: string) => void;
};

function SuggestedQuestions({
  questions,
  disabled = false,
  label = "Bạn có thể hỏi tiếp",
  onSelect,
}: SuggestedQuestionsProps) {
  if (questions.length === 0) return null;

  return (
    <section className="chat-suggestions" aria-label={label}>
      <p>{label}</p>
      <div className="chat-suggestions__list">
        {questions.map((question) => (
          <button
            key={question}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(question)}
          >
            <span>{question}</span>
            <Icon icon="zi-chevron-right" />
          </button>
        ))}
      </div>
    </section>
  );
}

export default SuggestedQuestions;
