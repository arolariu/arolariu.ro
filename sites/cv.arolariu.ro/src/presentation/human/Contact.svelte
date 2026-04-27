<script lang="ts">
  import {AnimatedSection} from "@/components/motion";
  import {author} from "@/data";
  import {cx} from "@/lib/utils/classNames";
  import styles from "./Contact.module.scss";

  let formData = $state({
    name: "",
    email: "",
    message: "",
  });

  let isSubmitting = $state(false);
  let submitMessage = $state("");
  let focusedField = $state("");

  async function handleSubmit(event: Event) {
    event.preventDefault();
    const subject = `[cv.arolariu.ro] - ${formData.name}`;
    const body = `Hello,\n\n${formData.message}\n\n— ${formData.name}\n${formData.email}`;
    const mailtoUrl = `mailto:${author.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.location.href = mailtoUrl;
  }

  const contactInfo = [
    {
      icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z",
      title: "Location",
      value: author.location,
    },
    {
      icon: "M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
      title: "Email",
      value: author.email,
    },
    {
      icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0H8m8 0v2a2 2 0 01-2 2H10a2 2 0 01-2-2V6",
      title: "Website",
      value: author.website,
    },
  ];
</script>

<section
  id="contact"
  class={styles.section}>
  <div class={styles.background}></div>

  <div class={styles.container}>
    <AnimatedSection
      id="contact-title"
      animation="fade-up">
      <h2 class={styles.title}>
        Get In <span class={styles.accent}>Touch</span>
      </h2>
    </AnimatedSection>

    <div class={styles.contentWrapper}>
      <div class={styles.grid}>
        <!-- Contact Information -->
        <AnimatedSection
          id="contact-info"
          animation="fade-right"
          delay={200}>
          <div class={styles.card}>
            <h3 class={cx(styles.cardTitle, styles.accent)}> Let's Connect </h3>
            <p class={styles.cardDescription}>
              I'm always interested in new opportunities and exciting projects. Whether you have a question, want to collaborate, or just
              want to say hello, feel free to reach out!
            </p>

            <div class={styles.infoList}>
              {#each contactInfo as info, index}
                <div
                  class={styles.infoItem}
                  style="--delay: {400 + index * 100}ms">
                  <div class={styles.infoIcon}>
                    <svg
                      class={styles.infoIconSvg}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d={info.icon}></path>
                    </svg>
                  </div>
                  <div>
                    <h4 class={styles.infoTitle}>{info.title}</h4>
                    <p class={styles.infoValue}>
                      {info.value}
                    </p>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </AnimatedSection>

        <!-- Contact Form -->
        <AnimatedSection
          id="contact-form"
          animation="fade-left"
          delay={400}>
          <div class={styles.card}>
            <form
              onsubmit={handleSubmit}
              class={styles.form}>
              <div class={styles.formGroup}>
                <label
                  for="name"
                  class={cx(styles.label, focusedField === "name" && styles.labelFocused)}>
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  bind:value={formData.name}
                  onfocus={() => (focusedField = "name")}
                  onblur={() => (focusedField = "")}
                  required
                  class={styles.input}
                  placeholder="Your Name" />
              </div>

              <div class={styles.formGroup}>
                <label
                  for="email"
                  class={cx(styles.label, focusedField === "email" && styles.labelFocused)}>
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  bind:value={formData.email}
                  onfocus={() => (focusedField = "email")}
                  onblur={() => (focusedField = "")}
                  required
                  class={styles.input}
                  placeholder="your.email@example.com" />
              </div>

              <div class={styles.formGroup}>
                <label
                  for="message"
                  class={cx(styles.label, focusedField === "message" && styles.labelFocused)}>
                  Message
                </label>
                <textarea
                  id="message"
                  bind:value={formData.message}
                  onfocus={() => (focusedField = "message")}
                  onblur={() => (focusedField = "")}
                  required
                  rows="5"
                  class={styles.textarea}
                  placeholder="Your message..."></textarea>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                class={styles.submitButton}>
                {#if isSubmitting}
                  <span class={styles.buttonContent}>
                    <svg
                      class={styles.spinner}
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24">
                      <circle
                        class={styles.spinnerCircle}
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        stroke-width="4"></circle>
                      <path
                        class={styles.spinnerPath}
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Sending...
                  </span>
                {:else}
                  Send Message
                {/if}
              </button>

              {#if submitMessage}
                <div class={styles.successMessage}>
                  {submitMessage}
                </div>
              {/if}
            </form>
          </div>
        </AnimatedSection>
      </div>
    </div>
  </div>
</section>
